"""Column definitions for the UCI Bank Marketing dataset.

Source: https://archive.ics.uci.edu/dataset/222/bank+marketing
Target column `y` is binary: 'yes' / 'no' (client subscribed a term deposit).
"""
from __future__ import annotations

NUMERIC_FEATURES: list[str] = [
    "age",
    "balance",
    "day",
    "duration",
    "campaign",
    "pdays",
    "previous",
]

CATEGORICAL_FEATURES: list[str] = [
    "job",
    "marital",
    "education",
    "default",
    "housing",
    "loan",
    "contact",
    "month",
    "poutcome",
]

ALL_FEATURES: list[str] = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET: str = "y"
