"""
Deterministic EOD reconciliation service.
This layer NEVER calls an LLM. All outputs are ground truth figures.
"""
from __future__ import annotations
from collections import defaultdict
from typing import Any

from app.models.billing import VisitRecord, VALID_PAYMENT_MODES
from app.schemas.report import (
    ReconciliationReport,
    PaymentModeBreakdown,
    ValidationError,
)


def _parse_records(
    raw: list[dict[str, Any]],
) -> tuple[list[VisitRecord], list[ValidationError]]:
    valid: list[VisitRecord] = []
    errors: list[ValidationError] = []
    seen_visit_ids: set[str] = set()

    for idx, row in enumerate(raw):
        visit_id = row.get("visit_id") if isinstance(row, dict) else None

        if isinstance(row, dict) and visit_id and visit_id in seen_visit_ids:
            errors.append(
                ValidationError(
                    visit_id=visit_id,
                    row_index=idx,
                    error=f"Duplicate visit_id '{visit_id}' — skipping.",
                )
            )
            continue

        try:
            record = VisitRecord.model_validate(row)
            valid.append(record)
            if record.visit_id:
                seen_visit_ids.add(record.visit_id)
        except Exception as exc:
            errors.append(
                ValidationError(
                    visit_id=str(visit_id) if visit_id else None,
                    row_index=idx,
                    error=str(exc),
                )
            )

    return valid, errors


def compute_reconciliation(
    raw_records: list[dict[str, Any]],
    date_str: str,
) -> tuple[ReconciliationReport, list[VisitRecord], list[ValidationError]]:
    """
    Parse, validate, and compute the full EOD reconciliation.
    Returns (report, valid_records, validation_errors).
    """
    valid_records, errors = _parse_records(raw_records)

    billed: dict[str, int] = defaultdict(int)
    collected: dict[str, int] = defaultdict(int)
    refund_total_paise = 0
    refund_count = 0
    visit_count = 0
    pending_visits_count = 0
    patient_ids: set[str] = set()
    doctor_ids: set[str] = set()
    clinic_id = ""

    for rec in valid_records:
        clinic_id = rec.clinic_id
        patient_ids.add(rec.visit_id)
        doctor_ids.add(rec.doctor_id)
        mode = (rec.payment_mode or "unknown").lower()

        if rec.is_refund:
            refund_total_paise += abs(rec.amount_paid_paise)
            refund_count += 1
            collected[mode] = collected[mode] + rec.amount_paid_paise
        else:
            visit_count += 1
            line_total = sum(
                li.qty * li.unit_price_paise for li in rec.line_items
            )
            billed_amount = line_total - rec.discount_paise
            collected_amount = rec.amount_paid_paise

            billed[mode] = billed[mode] + billed_amount
            collected[mode] = collected[mode] + collected_amount

            if collected_amount < billed_amount:
                pending_visits_count += 1

    breakdown: list[PaymentModeBreakdown] = []
    for mode in sorted(VALID_PAYMENT_MODES):
        b = billed.get(mode, 0)
        c = collected.get(mode, 0)
        breakdown.append(
            PaymentModeBreakdown(
                mode=mode,
                billed_paise=b,
                collected_paise=c,
                outstanding_paise=b - c,
            )
        )

    total_billed = sum(billed.values())
    total_collected = sum(collected.values())
    collection_rate = (
        int((total_collected / total_billed) * 100)
        if total_billed > 0
        else 0
    )

    report = ReconciliationReport(
        date=date_str,
        clinic_id=clinic_id or "UNKNOWN",
        total_billed_paise=total_billed,
        total_collected_paise=total_collected,
        outstanding_paise=total_billed - total_collected,
        total_refunds_paise=refund_total_paise,
        visit_count=visit_count,
        refund_count=refund_count,
        pending_visits_count=pending_visits_count,
        collection_rate_pct=collection_rate,
        payment_breakdown=breakdown,
        total_transactions=len(valid_records),
        valid_records=len(valid_records),
        invalid_records=len(errors),
        patient_count=len(patient_ids),
        doctor_count=len(doctor_ids),
    )

    return report, valid_records, errors
