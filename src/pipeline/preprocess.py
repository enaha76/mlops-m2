"""DVC stage: preprocess.

Reads the raw Bank Marketing CSV that DVC tracks from S3 (via `dvc import-url`),
cleans it, builds a reusable sklearn preprocessing pipeline, and writes:
  - data/processed/train.parquet
  - data/processed/test.parquet
  - data/processed/preprocessor.joblib
"""
from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.common.config import load_params
from src.pipeline.schema import CATEGORICAL_FEATURES, NUMERIC_FEATURES, TARGET

RAW = Path("data/raw/bank.csv")
OUT = Path("data/processed")


def _read_raw() -> pd.DataFrame:
    # UCI ships the bank dataset with ';' as separator.
    return pd.read_csv(RAW, sep=";")


def _build_preprocessor(numeric_strategy: str, categorical_strategy: str) -> ColumnTransformer:
    numeric = Pipeline(steps=[
        ("impute", SimpleImputer(strategy=numeric_strategy)),
        ("scale", StandardScaler()),
    ])
    categorical = Pipeline(steps=[
        ("impute", SimpleImputer(strategy=categorical_strategy, fill_value="missing")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer(transformers=[
        ("num", numeric, NUMERIC_FEATURES),
        ("cat", categorical, CATEGORICAL_FEATURES),
    ])


def main() -> None:
    params = load_params()
    p_pre = params["preprocess"]
    p_data = params["data"]

    df = _read_raw()
    if p_pre["drop_duplicates"]:
        df = df.drop_duplicates()

    y = (df[TARGET].str.strip().str.lower() == "yes").astype(int)
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=p_data["test_size"],
        random_state=p_data["random_state"],
        stratify=y,
    )

    pre = _build_preprocessor(p_pre["numeric_strategy"], p_pre["categorical_strategy"])
    X_train_t = pre.fit_transform(X_train)
    X_test_t = pre.transform(X_test)

    feature_names = pre.get_feature_names_out()
    train_df = pd.DataFrame(X_train_t, columns=feature_names)
    train_df[TARGET] = y_train.to_numpy()
    test_df = pd.DataFrame(X_test_t, columns=feature_names)
    test_df[TARGET] = y_test.to_numpy()

    OUT.mkdir(parents=True, exist_ok=True)
    train_df.to_parquet(OUT / "train.parquet", index=False)
    test_df.to_parquet(OUT / "test.parquet", index=False)
    joblib.dump(pre, OUT / "preprocessor.joblib")
    print(f"train={train_df.shape} test={test_df.shape} features={len(feature_names)}")


if __name__ == "__main__":
    main()
