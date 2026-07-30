"""
Processing orchestrator: ties validation → reconciliation → analytics → narrative.
"""
from __future__ import annotations
import json
from typing import Any

from app.services.reconciliation import compute_reconciliation
from app.services.analytics import compute_analytics
from app.services.narrative import generate_narrative
from app.schemas.report import ProcessingResult


def safe_parse_json(content: bytes) -> list[dict[str, Any]]:
    """Decode bytes to a list of record dicts. Returns [] on any parse error."""
    try:
        text = content.decode("utf-8-sig").strip()
    except (UnicodeDecodeError, AttributeError):
        return []
    if not text:
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        return []
    return [d for d in data if isinstance(d, dict)]


def process_billing_log(content: bytes, date_str: str) -> ProcessingResult:
    """Run the full deterministic pipeline on raw uploaded bytes."""
    raw_records = safe_parse_json(content)

    recon, valid_records, errors = compute_reconciliation(raw_records, date_str)
    analytics = compute_analytics(valid_records, date_str, recon.clinic_id)
    narrative = generate_narrative(recon, analytics)

    return ProcessingResult(
        reconciliation=recon,
        analytics=analytics,
        narrative=narrative,
        validation_errors=errors,
    )
