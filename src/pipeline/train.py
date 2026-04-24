"""DVC stage: train.

Loads the preprocessed training set, fits a model per params.yaml, and logs
the run (params + model) to MLflow. The run_id is written to a small file
so the evaluate/register stages can attach to the same run.
"""
from __future__ import annotations

import json
from pathlib import Path

import mlflow
import mlflow.sklearn
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier

from src.common.config import load_params, mlflow_tracking_uri
from src.pipeline.schema import TARGET

TRAIN = Path("data/processed/train.parquet")
PREPROCESSOR = Path("data/processed/preprocessor.joblib")
OUT = Path("data/processed")


def _make_model(cfg: dict):
    kind = cfg["model_type"]
    if kind == "logistic":
        return LogisticRegression(max_iter=1000, random_state=cfg["random_state"])
    if kind == "random_forest":
        return RandomForestClassifier(
            n_estimators=cfg["n_estimators"],
            max_depth=cfg["max_depth"],
            random_state=cfg["random_state"],
            n_jobs=-1,
        )
    if kind == "xgboost":
        return XGBClassifier(
            n_estimators=cfg["n_estimators"],
            max_depth=cfg["max_depth"],
            learning_rate=cfg["learning_rate"],
            random_state=cfg["random_state"],
            eval_metric="logloss",
            n_jobs=-1,
        )
    raise ValueError(f"Unknown model_type: {kind}")


def main() -> None:
    params = load_params()
    cfg = params["train"]

    mlflow.set_tracking_uri(mlflow_tracking_uri())
    mlflow.set_experiment(params["mlflow"]["experiment_name"])

    df = pd.read_parquet(TRAIN)
    X, y = df.drop(columns=[TARGET]), df[TARGET]

    with mlflow.start_run() as run:
        mlflow.log_params(cfg)
        mlflow.log_param("n_features", X.shape[1])
        mlflow.log_param("n_train_rows", X.shape[0])

        model = _make_model(cfg)
        model.fit(X, y)

        mlflow.sklearn.log_model(
            sk_model=model,
            artifact_path="model",
            input_example=X.iloc[:2],
        )

        # Pin the preprocessor to this run so the API can load the matching
        # feature transformer alongside the model. Atomic swap on /reload.
        if PREPROCESSOR.exists():
            mlflow.log_artifact(str(PREPROCESSOR), artifact_path="preprocessor")

        (OUT / "run_id.json").write_text(json.dumps({"run_id": run.info.run_id}))
        print(f"run_id={run.info.run_id} model={cfg['model_type']}")


if __name__ == "__main__":
    main()
