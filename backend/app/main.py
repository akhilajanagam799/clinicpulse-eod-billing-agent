"""
FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import billing

app = FastAPI(
    title="Clinic EOD Billing & Analytics Agent",
    version="1.0.0",
    description=(
        "Deterministic end-of-day reconciliation, analytics, and narrative "
        "summary for a clinic's daily billing log."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(billing.router)


@app.get("/")
async def root():
    return {"service": "clinic-eod-agent", "status": "running"}
