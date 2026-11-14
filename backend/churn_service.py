"""
ChurnSense - prediction service (pure Python, no web framework).

This file loads YOUR existing trained model (churn_model.pkl) and YOUR dataset
(2_b2b_saas_churn_ltv.csv) and scores every customer ONCE, in a single batch,
when the API starts. The web routes in main.py simply read from these results.

Nothing here retrains the model. The risk thresholds (30% / 70%), the risk
factors and the recommendations are the same rules that were already in
backend/main.py.
"""

import math
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

# --------------------------------------------------------------------------
# File locations (one folder above backend/). Can be overridden with env vars.
# --------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "churn_model.pkl"))
CSV_PATH = Path(os.getenv("DATA_PATH", BASE_DIR / "2_b2b_saas_churn_ltv.csv"))

# Column order expected by the existing model (same as train_model.py).
FEATURE_COLUMNS = [
    "Subscription_Plan",
    "MRR_USD",
    "Tenure_Months",
    "Active_Features_Count",
    "Support_Tickets_Last_30D",
    "Days_Since_Last_Login",
    "NPS_Score",
    "Estimated_LTV_USD",
]

# Friendly names for the API / website.
PROFILE_FIELDS = {
    "MRR_USD": "mrr_usd",
    "Tenure_Months": "tenure_months",
    "Active_Features_Count": "active_features",
    "Support_Tickets_Last_30D": "support_tickets_30d",
    "Days_Since_Last_Login": "days_since_last_login",
    "NPS_Score": "nps_score",
    "Estimated_LTV_USD": "estimated_ltv_usd",
}

VALID_RISKS = ("HIGH", "MEDIUM", "LOW")
VALID_SORTS = ("id", "probability_desc", "probability_asc", "mrr_desc")


# --------------------------------------------------------------------------
# Existing business rules (unchanged)
# --------------------------------------------------------------------------
def get_risk(probability: float) -> str:
    if probability < 30:
        return "LOW"
    if probability < 70:
        return "MEDIUM"
    return "HIGH"


def explain_customer(row: pd.Series):
    """Risk factors + recommendations (same rules as the original backend)."""
    factors = []
    recommendations = []

    if row["Days_Since_Last_Login"] > 14:
        factors.append("Customer has not logged in recently")
        recommendations.append("Send a personalized re-engagement message")

    if row["Support_Tickets_Last_30D"] >= 3:
        factors.append("Multiple recent support tickets")
        recommendations.append("Arrange a support follow-up")

    if row["Active_Features_Count"] <= 3:
        factors.append("Low usage of available features")
        recommendations.append("Offer a product walkthrough")

    if row["NPS_Score"] < 6:
        factors.append("Low customer satisfaction score")
        recommendations.append("Contact the customer to understand their concerns")

    if row["Tenure_Months"] < 6:
        factors.append("Relatively new customer")
        recommendations.append("Provide onboarding assistance")

    if not factors:
        factors.append("No predefined risk indicators were triggered")
    if not recommendations:
        recommendations.append("Maintain regular engagement and monitor account activity")

    return factors, recommendations


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _clean(value):
    """Make a value safe for JSON (NaN -> None, numpy -> python)."""
    if value is None:
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        value = float(value)
        return None if math.isnan(value) or math.isinf(value) else value
    return value


# --------------------------------------------------------------------------
# The service
# --------------------------------------------------------------------------
class ChurnService:
    def __init__(self, model_path: Path = MODEL_PATH, csv_path: Path = CSV_PATH):
        self.model = joblib.load(model_path)
        self.raw = pd.read_csv(csv_path)

        missing = [c for c in ["Account_ID", *FEATURE_COLUMNS] if c not in self.raw.columns]
        if missing:
            raise RuntimeError(f"Dataset is missing expected columns: {missing}")

        # ONE batch call to the model for every customer (about 0.1 second).
        probabilities = self.model.predict_proba(self.raw[FEATURE_COLUMNS])[:, 1] * 100

        scored = self.raw.copy()
        scored["churn_probability"] = np.round(probabilities, 2)
        scored["risk"] = [get_risk(p) for p in probabilities]

        factors, recommendations = [], []
        for _, row in scored.iterrows():
            f, r = explain_customer(row)
            factors.append(f)
            recommendations.append(r)
        scored["risk_factors"] = factors
        scored["recommendations"] = recommendations

        self.scored = scored
        self._index = {str(acc): i for i, acc in enumerate(scored["Account_ID"])}
        self.plans = sorted(scored["Subscription_Plan"].astype(str).unique().tolist())

        self._stats = self._build_stats()
        self._model_info = self._build_model_info(probabilities)

    # ---- single customer ----------------------------------------------
    def _summary(self, row) -> dict:
        return {
            "account_id": str(row["Account_ID"]),
            "subscription_plan": str(row["Subscription_Plan"]),
            "mrr_usd": _clean(row["MRR_USD"]),
            "churn_probability": _clean(row["churn_probability"]),
            "risk": row["risk"],
        }

    def get_customer(self, account_id: str):
        position = self._index.get(account_id)
        if position is None:
            return None
        row = self.scored.iloc[position]
        data = self._summary(row)
        data["profile"] = {name: _clean(row[col]) for col, name in PROFILE_FIELDS.items()}
        data["risk_factors"] = list(row["risk_factors"])
        data["recommendations"] = list(row["recommendations"])
        return data

    # ---- list / search ------------------------------------------------
    def search(self, q="", plan="", risk="", sort="id", limit=100, offset=0) -> dict:
        data = self.scored

        query = (q or "").strip().lower()
        if query:
            data = data[data["Account_ID"].astype(str).str.lower().str.contains(query, regex=False)]
        if plan:
            data = data[data["Subscription_Plan"].astype(str).str.lower() == plan.strip().lower()]
        if risk:
            data = data[data["risk"] == risk.strip().upper()]

        if sort == "probability_desc":
            data = data.sort_values(["churn_probability", "Account_ID"], ascending=[False, True])
        elif sort == "probability_asc":
            data = data.sort_values(["churn_probability", "Account_ID"], ascending=[True, True])
        elif sort == "mrr_desc":
            data = data.sort_values(["MRR_USD", "Account_ID"], ascending=[False, True])
        # "id" keeps the original dataset order

        total = int(len(data))
        page = data.iloc[offset: offset + limit]
        customers = [self._summary(row) for _, row in page.iterrows()]
        return {
            "total": total,
            "count": len(customers),
            "limit": limit,
            "offset": offset,
            "customers": customers,
        }

    # ---- dashboard ----------------------------------------------------
    def stats(self) -> dict:
        return self._stats

    def _build_stats(self) -> dict:
        s = self.scored
        counts = {r: int((s["risk"] == r).sum()) for r in VALID_RISKS}
        total = int(len(s))

        by_plan = []
        for plan in self.plans:
            sub = s[s["Subscription_Plan"].astype(str) == plan]
            by_plan.append(
                {
                    "plan": plan,
                    "total": int(len(sub)),
                    "high": int((sub["risk"] == "HIGH").sum()),
                    "medium": int((sub["risk"] == "MEDIUM").sum()),
                    "low": int((sub["risk"] == "LOW").sum()),
                    "average_probability": round(float(sub["churn_probability"].mean()), 2),
                }
            )

        # Histogram in 10% buckets: 0-10, 10-20, ... 90-100
        edges = list(range(0, 101, 10))
        hist_counts, _ = np.histogram(s["churn_probability"], bins=edges)
        histogram = [
            {"range": f"{edges[i]}-{edges[i + 1]}%", "count": int(hist_counts[i])}
            for i in range(len(hist_counts))
        ]

        mrr_total = float(s["MRR_USD"].sum())
        mrr_high = float(s.loc[s["risk"] == "HIGH", "MRR_USD"].sum())

        averages = {name: _clean(round(float(s[col].mean()), 2)) for col, name in PROFILE_FIELDS.items()}

        return {
            "total_customers": total,
            "high_risk": counts["HIGH"],
            "medium_risk": counts["MEDIUM"],
            "low_risk": counts["LOW"],
            "risk_distribution": counts,
            "average_churn_probability": round(float(s["churn_probability"].mean()), 2),
            "total_mrr_usd": round(mrr_total, 2),
            "high_risk_mrr_usd": round(mrr_high, 2),
            "by_plan": by_plan,
            "probability_histogram": histogram,
            "averages": averages,
            "plans": self.plans,
        }

    # ---- model information -------------------------------------------
    def model_info(self) -> dict:
        return self._model_info

    def _build_model_info(self, all_probabilities) -> dict:
        pipeline = self.model
        classifier = pipeline.named_steps["classifier"]

        # Feature importance, with the one-hot plan columns added back together.
        names = pipeline.named_steps["preprocessor"].get_feature_names_out()
        importance = {}
        for name, value in zip(names, classifier.feature_importances_):
            clean = name.split("__", 1)[-1]
            if clean.startswith("Subscription_Plan"):
                clean = "Subscription_Plan"
            importance[clean] = importance.get(clean, 0.0) + float(value)
        feature_importance = sorted(
            [{"feature": k, "importance": round(v * 100, 2)} for k, v in importance.items()],
            key=lambda item: item["importance"],
            reverse=True,
        )

        # Evaluate the EXISTING model on the same 20% hold-out split that
        # train_model.py used (random_state=42, stratified). No retraining.
        X = self.raw.drop(columns=["Account_ID", "Churn_Next_30D"])
        y = self.raw["Churn_Next_30D"]
        _, X_test, _, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        y_pred = pipeline.predict(X_test)
        y_score = pipeline.predict_proba(X_test)[:, 1]
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()

        metrics = {
            "test_rows": int(len(X_test)),
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision_churn": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "recall_churn": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "f1_churn": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, y_score)), 4),
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp),
            },
        }

        return {
            "algorithm": type(classifier).__name__,
            "n_estimators": int(classifier.n_estimators),
            "class_weight": classifier.class_weight,
            "random_state": classifier.random_state,
            "features": FEATURE_COLUMNS,
            "dataset_rows": int(len(self.raw)),
            "actual_churn_rate": round(float(self.raw["Churn_Next_30D"].mean() * 100), 2),
            "missing_nps_rows": int(self.raw["NPS_Score"].isna().sum()),
            "feature_importance": feature_importance,
            "holdout_metrics": metrics,
            "risk_thresholds": {"low_below": 30, "high_from": 70},
        }
