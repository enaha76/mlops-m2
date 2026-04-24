"""Shared config loader. Reads params.yaml once and exposes it as a dict."""
from __future__ import annotations

import os
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
PARAMS_PATH = ROOT / "params.yaml"


def load_params() -> dict:
    if not PARAMS_PATH.exists():
        raise FileNotFoundError(
            f"{PARAMS_PATH} not found. Copy params.example.yaml to params.yaml "
            "(it's gitignored by design — see project spec section 2.5)."
        )
    with PARAMS_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def mlflow_tracking_uri() -> str:
    # Env var wins over params.yaml so CI can override per-run.
    return os.getenv("MLFLOW_TRACKING_URI") or load_params()["mlflow"]["tracking_uri"]
