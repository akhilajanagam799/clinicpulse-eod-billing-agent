"""
Billing router — REST endpoints for uploading and processing billing logs.
"""
from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.processor import process_billing_log
from app.schemas.report import ProcessingResult

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.post("/process", response_model=ProcessingResult)
async def process_billing(file: UploadFile = File(...)) -> ProcessingResult:
    """
    Upload a billing log JSON file. Validates every record individually —
    malformed rows are rejected with an actionable error while valid rows
    are still processed. Returns the full reconciliation + analytics + narrative.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Derive date from filename (billing_log_YYYY-MM-DD.json pattern)
    name = file.filename or ""
    import re
    match = re.search(r"(\d{4}-\d{2}-\d{2})", name)
    date_str = match.group(1) if match else datetime.utcnow().strftime("%Y-%m-%d")

    return process_billing_log(content, date_str)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "clinic-eod-agent"}
