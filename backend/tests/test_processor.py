"""
Unit tests for the deterministic processing pipeline.
Run with:  pytest backend/tests -q
"""
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services.processor import process_billing_log, safe_parse_json  # noqa: E402


def _record(**overrides):
    base = {
        "clinic_id": "CLINIC-01",
        "visit_id": "V-001",
        "timestamp": "2026-07-27T09:15:00Z",
        "doctor_id": "DOC-01",
        "line_items": [
            {"drug_name": "Paracetamol", "qty": 2, "unit_price_paise": 500}
        ],
        "payment_mode": "cash",
        "amount_paid_paise": 1000,
        "discount_paise": 0,
        "is_refund": False,
    }
    base.update(overrides)
    return base


def test_valid_record_processes():
    result = process_billing_log(json.dumps([_record()]).encode(), "2026-07-27")
    assert result.reconciliation.valid_records == 1
    assert result.reconciliation.invalid_records == 0
    assert result.reconciliation.total_billed_paise == 1000
    assert result.reconciliation.total_collected_paise == 1000
    assert result.reconciliation.outstanding_paise == 0
    assert result.reconciliation.visit_count == 1
    assert result.reconciliation.collection_rate_pct == 100
    assert result.narrative.status == "success"


def test_refund_is_negative_and_counted():
    records = [
        _record(visit_id="V-1"),
        _record(visit_id="V-2", is_refund=True, payment_mode=None, amount_paid_paise=-500),
    ]
    result = process_billing_log(json.dumps(records).encode(), "2026-07-27")
    assert result.reconciliation.refund_count == 1
    assert result.reconciliation.total_refunds_paise == 500
    assert result.reconciliation.total_collected_paise == 1000 - 500
    assert result.reconciliation.visit_count == 1


def test_malformed_record_rejected_valid_kept():
    records = [
        _record(visit_id="V-good"),
        {"visit_id": "V-bad", "line_items": []},
    ]
    result = process_billing_log(json.dumps(records).encode(), "2026-07-27")
    assert result.reconciliation.valid_records == 1
    assert result.reconciliation.invalid_records == 1
    assert len(result.validation_errors) == 1
    assert result.narrative.status == "partial"


def test_unknown_payment_mode_rejected():
    records = [_record(payment_mode="crypto")]
    result = process_billing_log(json.dumps(records).encode(), "2026-07-27")
    assert result.reconciliation.invalid_records == 1
    assert "payment_mode" in result.validation_errors[0].error


def test_missing_payment_mode_rejected():
    records = [
        {
            "clinic_id": "CLINIC-01",
            "visit_id": "V-missing",
            "timestamp": "2026-07-27T09:15:00Z",
            "doctor_id": "DOC-01",
            "line_items": [{"drug_name": "X", "qty": 1, "unit_price_paise": 100}],
            "amount_paid_paise": 100,
            "is_refund": False,
        }
    ]
    result = process_billing_log(json.dumps(records).encode(), "2026-07-27")
    assert result.reconciliation.invalid_records == 1


def test_empty_file_handled():
    result = process_billing_log(b"", "2026-07-27")
    assert result.reconciliation.total_transactions == 0
    assert result.reconciliation.valid_records == 0
    assert result.narrative.status == "empty"


def test_malformed_json_handled():
    result = process_billing_log(b"{not valid json", "2026-07-27")
    assert result.reconciliation.total_transactions == 0
    assert result.reconciliation.invalid_records == 0


def test_safe_parse_json_handles_dict():
    assert safe_parse_json(b'{"a": 1}') == [{"a": 1}]
    assert safe_parse_json(b"") == []
    assert safe_parse_json(b"garbage") == []


def test_duplicate_visit_id_rejected():
    records = [
        _record(visit_id="V-dup"),
        _record(visit_id="V-dup"),
    ]
    result = process_billing_log(json.dumps(records).encode(), "2026-07-27")
    assert result.reconciliation.valid_records == 1
    assert result.reconciliation.invalid_records == 1
    assert "Duplicate" in result.validation_errors[0].error


def test_analytics_peak_hour():
    records = [
        _record(visit_id="V-1", timestamp="2026-07-27T09:15:00Z", amount_paid_paise=1000),
        _record(
            visit_id="V-2",
            timestamp="2026-07-27T13:05:00Z",
            amount_paid_paise=3000,
            line_items=[{"drug_name": "Omeprazole", "qty": 3, "unit_price_paise": 1000}],
        ),
    ]
    result = process_billing_log(json.dumps(records).encode(), "2026-07-27")
    assert result.analytics.peak_hour_label.startswith("1pm")
    assert result.analytics.peak_hour_revenue_paise == 3000
    top = result.analytics.top_medicines_by_qty[0]
    assert top.drug_name == "OMEPRAZOLE"
    assert top.total_qty == 3


def test_narrative_traceability():
    result = process_billing_log(json.dumps([_record()]).encode(), "2026-07-27")
    for fig in result.narrative.traced_figures:
        assert isinstance(fig.report_field, str)
        assert len(fig.report_field) > 0
    assert "₹" in result.narrative.message


def test_pending_visits_counted():
    # amount_paid (500) < billed (1000) -> pending
    records = [_record(amount_paid_paise=500)]
    result = process_billing_log(json.dumps(records).encode(), "2026-07-27")
    assert result.reconciliation.pending_visits_count == 1
    assert result.reconciliation.outstanding_paise == 500
    assert result.reconciliation.collection_rate_pct == 50
