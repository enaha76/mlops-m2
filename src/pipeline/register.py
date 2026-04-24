"""DVC stage: register.

Promotes the trained model to the MLflow Model Registry under the name set
in params.yaml, but only if its metrics meet the configured thresholds.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from mlflow import MlflowClient

from src.common.config import load_params, mlflow_tracking_uri

OUT = Path("data/processed")


def main() -> None:
    params = load_params()
    thresholds = params["evaluate"]["metric_threshold"]
    model_name = params["register"]["model_name"]
    promote_to = params["register"]["promote_to"]

    metrics = json.loads((OUT / "metrics.json").read_text())
    run_id = json.loads((OUT / "run_id.json").read_text())["run_id"]

    failed = {k: (metrics[k], thresholds[k]) for k in thresholds if metrics.get(k, 0) < thresholds[k]}
    if failed:
        print(f"Model below threshold — skipping registration. {failed}", file=sys.stderr)
        sys.exit(0)

    client = MlflowClient(tracking_uri=mlflow_tracking_uri())
    try:
        client.create_registered_model(model_name)
    except Exception:
        pass  # already exists

    mv = client.create_model_version(
        name=model_name,
        source=f"runs:/{run_id}/model",
        run_id=run_id,
    )
    client.transition_model_version_stage(
        name=model_name,
        version=mv.version,
        stage=promote_to,
        archive_existing_versions=True,
    )
    print(f"registered {model_name} v{mv.version} → {promote_to}")


if __name__ == "__main__":
    main()
