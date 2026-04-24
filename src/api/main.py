"""FastAPI prediction service.

Loads the latest `Production` (or `Staging`) version of the registered model
from MLflow at startup, exposes:

  GET  /          — health check (spec C2)
  GET  /ui        — minimal HTML form (spec C5)
  POST /predict   — JSON body → prediction (spec C1)
  POST /reload    — force reload the model (used by Workflow 2 after retrain)
"""
from __future__ import annotations

import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import mlflow
import mlflow.artifacts
import mlflow.sklearn
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from mlflow.tracking import MlflowClient
from pydantic import BaseModel, Field

from src.pipeline.schema import CATEGORICAL_FEATURES, NUMERIC_FEATURES

log = logging.getLogger("api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000")
MODEL_NAME = os.getenv("MLFLOW_MODEL_NAME", "bank-marketing-classifier")
MODEL_STAGE = os.getenv("MLFLOW_MODEL_STAGE", "Production")

# Both model and preprocessor come from the SAME MLflow run — so a /reload
# after retraining is atomic: new model + matching feature transformer.
_state: dict = {"model": None, "preprocessor": None, "version": None, "run_id": None}
_lock = threading.Lock()


def _resolve_production_version(client: MlflowClient):
    versions = client.get_latest_versions(MODEL_NAME, stages=[MODEL_STAGE])
    if not versions:
        raise RuntimeError(f"No version of '{MODEL_NAME}' in stage '{MODEL_STAGE}'")
    return versions[0]


def _load_model() -> None:
    mlflow.set_tracking_uri(TRACKING_URI)
    client = MlflowClient(tracking_uri=TRACKING_URI)

    mv = _resolve_production_version(client)
    uri = f"models:/{MODEL_NAME}/{MODEL_STAGE}"
    log.info("Loading model %s v%s (run %s)", MODEL_NAME, mv.version, mv.run_id)

    model = mlflow.sklearn.load_model(uri)

    # Pull the preprocessor from the same run that produced this model version.
    preprocessor = None
    try:
        local_path = mlflow.artifacts.download_artifacts(
            run_id=mv.run_id,
            artifact_path="preprocessor/preprocessor.joblib",
        )
        preprocessor = joblib.load(local_path)
    except Exception as e:
        log.warning("Could not fetch preprocessor from run %s: %s", mv.run_id, e)

    with _lock:
        _state["model"] = model
        _state["preprocessor"] = preprocessor
        _state["version"] = f"{MODEL_NAME}/v{mv.version}/{MODEL_STAGE}"
        _state["run_id"] = mv.run_id


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        _load_model()
    except Exception as e:
        # Start the server anyway — health check reports degraded instead of crashing.
        log.exception("Model load failed at startup: %s", e)
    yield


app = FastAPI(title="Bank Marketing Predictor", version="1.0.0", lifespan=lifespan)


class PredictRequest(BaseModel):
    age: int = Field(ge=18, le=100, examples=[41])
    job: str = Field(examples=["management"])
    marital: str = Field(examples=["married"])
    education: str = Field(examples=["tertiary"])
    default: str = Field(examples=["no"])
    balance: float = Field(examples=[1500.0])
    housing: str = Field(examples=["yes"])
    loan: str = Field(examples=["no"])
    contact: str = Field(examples=["cellular"])
    day: int = Field(ge=1, le=31, examples=[15])
    month: str = Field(examples=["may"])
    duration: int = Field(ge=0, examples=[180])
    campaign: int = Field(ge=0, examples=[2])
    pdays: int = Field(examples=[-1])
    previous: int = Field(ge=0, examples=[0])
    poutcome: str = Field(examples=["unknown"])


class PredictResponse(BaseModel):
    prediction: str
    probability_yes: float
    model_version: str | None


@app.get("/")
def health() -> dict:
    loaded = _state["model"] is not None and _state["preprocessor"] is not None
    return {
        "status": "ok" if loaded else "degraded",
        "model_loaded": _state["model"] is not None,
        "preprocessor_loaded": _state["preprocessor"] is not None,
        "model_version": _state["version"],
        "run_id": _state["run_id"],
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    with _lock:
        model = _state["model"]
        pre = _state["preprocessor"]
        version = _state["version"]

    if model is None or pre is None:
        raise HTTPException(status_code=503, detail="Model or preprocessor not loaded")

    row = pd.DataFrame([req.model_dump()])[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    X = pre.transform(row)
    proba = float(model.predict_proba(X)[0, 1])
    label = "yes" if proba >= 0.5 else "no"
    return PredictResponse(prediction=label, probability_yes=proba, model_version=version)


@app.post("/reload")
def reload_model() -> dict:
    try:
        _load_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reload failed: {e}")
    return {"status": "reloaded", "model_version": _state["version"]}


@app.get("/ui")
def ui() -> FileResponse:
    return FileResponse(Path(__file__).parent / "static" / "index.html")
