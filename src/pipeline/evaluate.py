"""DVC stage: evaluate.

Pulls the trained model from MLflow (by run_id), scores it on the test split,
logs metrics to the same run, and writes metrics.json for DVC to track.
"""
from __future__ import annotations

import json
from pathlib import Path

import mlflow
import mlflow.sklearn
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from src.common.config import load_params, mlflow_tracking_uri
from src.pipeline.schema import TARGET

TEST = Path("data/processed/test.parquet")
OUT = Path("data/processed")


def main() -> None:
    params = load_params()
    mlflow.set_tracking_uri(mlflow_tracking_uri())

    run_id = json.loads((OUT / "run_id.json").read_text())["run_id"]
    model = mlflow.sklearn.load_model(f"runs:/{run_id}/model")

    df = pd.read_parquet(TEST)
    X, y = df.drop(columns=[TARGET]), df[TARGET]

    proba = model.predict_proba(X)[:, 1]
    pred = (proba >= 0.5).astype(int)

    metrics = {
        "accuracy": float(accuracy_score(y, pred)),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, proba)),
    }

    with mlflow.start_run(run_id=run_id):
        for k, v in metrics.items():
            mlflow.log_metric(k, v)

    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
