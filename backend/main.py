"""
ChurnSense API (FastAPI).

Run locally (from inside the backend folder):
    uvicorn main:app --reload --port 8000

All the real work (loading churn_model.pkl, scoring customers, risk rules)
lives in churn_service.py. These routes just return its results as JSON.
"""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from churn_service import VALID_RISKS, VALID_SORTS, ChurnService

app = FastAPI(
    title="Dynamic B2B Customer Churn Predictor API",
    description="API for searching customers and retrieving churn predictions.",
    version="2.0.0",
)

# --------------------------------------------------------------------------
# CORS: which websites are allowed to call this API.
#
# Local development works with no setup. For the live site, set the
# ALLOWED_ORIGINS environment variable on your hosting platform, e.g.
#     ALLOWED_ORIGINS=https://churnsense.vercel.app
# (several addresses can be separated with commas, no trailing slash).
# --------------------------------------------------------------------------
DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]
# Optional: allow Vercel preview links too, e.g. https://churnsense-.*\.vercel\.app
allowed_origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX") or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=False,  # no cookies are used, so this stays off
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Load the existing model and dataset once, and score all customers once.
try:
    service = ChurnService()
except Exception as exc:
    raise RuntimeError(f"Could not load the existing model or CSV: {exc}") from exc


@app.get("/")
def home():
    return {
        "message": "Dynamic B2B Customer Churn Predictor API",
        "status": "running",
        "customers": int(len(service.scored)),
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def get_stats():
    return service.stats()


@app.get("/api/model-info")
def get_model_info():
    return service.model_info()


@app.get("/api/customers")
def search_customers(
    q: str = "",
    plan: str = "",
    risk: str = "",
    sort: str = "id",
    limit: int = 100,
    offset: int = 0,
):
    if limit < 1 or limit > 500:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 500")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be 0 or more")
    if risk and risk.upper() not in VALID_RISKS:
        raise HTTPException(status_code=400, detail=f"Risk must be one of {', '.join(VALID_RISKS)}")
    if plan and plan.lower() not in [p.lower() for p in service.plans]:
        raise HTTPException(status_code=400, detail=f"Plan must be one of {', '.join(service.plans)}")
    if sort not in VALID_SORTS:
        raise HTTPException(status_code=400, detail=f"Sort must be one of {', '.join(VALID_SORTS)}")

    return service.search(q=q, plan=plan, risk=risk, sort=sort, limit=limit, offset=offset)


@app.get("/api/customers/{account_id}")
def get_customer(account_id: str):
    customer = service.get_customer(account_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
