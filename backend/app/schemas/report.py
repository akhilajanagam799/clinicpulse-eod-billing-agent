"""
Response schemas for the EOD Billing & Analytics API.
All monetary values are integer paise; consumers convert to rupees for display.
"""
from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class PaymentModeBreakdown(BaseModel):
    mode: str
    billed_paise: int
    collected_paise: int
    outstanding_paise: int


class ReconciliationReport(BaseModel):
    date: str
    clinic_id: str
    # Core financials
    total_billed_paise: int
    total_collected_paise: int
    outstanding_paise: int
    total_refunds_paise: int
    # Visit counts
    visit_count: int           # non-refund valid records ("16 visits")
    refund_count: int
    pending_visits_count: int  # visits where amount_paid < billed-discount
    collection_rate_pct: int   # floor((collected/billed) * 100); 0 if billed=0
    # Breakdown by payment mode
    payment_breakdown: list[PaymentModeBreakdown]
    # Record quality
    total_transactions: int
    valid_records: int
    invalid_records: int
    # Operational
    patient_count: int
    doctor_count: int


class HourlyRevenue(BaseModel):
    hour: int
    label: str        # e.g. "9am-10am"
    revenue_paise: int
    is_peak: bool


class MedicineRanking(BaseModel):
    rank: int
    drug_name: str
    total_qty: int
    total_revenue_paise: int


class AnalyticsReport(BaseModel):
    date: str
    clinic_id: str
    revenue_by_hour: list[HourlyRevenue]
    peak_hour_label: str
    peak_hour_revenue_paise: int
    top_medicines_by_qty: list[MedicineRanking]
    top_medicines_by_revenue: list[MedicineRanking]


class TracedFigure(BaseModel):
    display_value: str
    report_field: str


class NarrativeSummary(BaseModel):
    message: str
    traced_figures: list[TracedFigure]
    recommendations: list[str]
    status: str   # "success" | "partial" | "empty"


class ValidationError(BaseModel):
    visit_id: Optional[str] = None
    row_index: int
    error: str


class ProcessingResult(BaseModel):
    reconciliation: ReconciliationReport
    analytics: AnalyticsReport
    narrative: NarrativeSummary
    validation_errors: list[ValidationError]
