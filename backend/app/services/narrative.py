"""
Narrative summary generator.

Design contract:
  - ONLY reads from the deterministic reconciliation + analytics reports.
  - Zero invented numbers. Every figure in the message also appears in traced_figures.
  - If a metric is unavailable (e.g. no data, or profit not computable), says so explicitly.
  - Handles empty/all-refund edge cases gracefully.
"""
from __future__ import annotations
from datetime import datetime

from app.schemas.report import (
    AnalyticsReport,
    NarrativeSummary,
    ReconciliationReport,
    TracedFigure,
)
from app.utils.money import fmt_rupees


def _display_date(date_str: str) -> str:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        return d.strftime("%-d %b")  # "27 Jul"
    except Exception:
        return date_str


def generate_narrative(
    recon: ReconciliationReport,
    analytics: AnalyticsReport,
) -> NarrativeSummary:
    figures: list[TracedFigure] = []

    def traced(display: str, field: str) -> str:
        figures.append(TracedFigure(display_value=display, report_field=field))
        return display

    # Handle edge case: no billing data at all
    if recon.valid_records == 0:
        return NarrativeSummary(
            message=(
                "No billing records were found in today's log. "
                "Please verify the uploaded file and try again."
            ),
            traced_figures=[],
            recommendations=[],
            status="empty",
        )

    display_date = _display_date(recon.date)
    total_billed = traced(fmt_rupees(recon.total_billed_paise), "total_billed")
    total_collected = traced(fmt_rupees(recon.total_collected_paise), "total_collected")
    outstanding = traced(fmt_rupees(recon.outstanding_paise), "outstanding")
    refunds = traced(fmt_rupees(recon.total_refunds_paise), "refunds")
    visit_count = recon.visit_count
    collection_rate = recon.collection_rate_pct
    pending_count = recon.pending_visits_count
    refund_count = recon.refund_count

    peak_label = traced(analytics.peak_hour_label, "revenue_by_hour[max]")
    peak_rev = traced(fmt_rupees(analytics.peak_hour_revenue_paise), "revenue_by_hour[max]")

    top_qty_name = "N/A"
    top_qty_units = 0
    if analytics.top_medicines_by_qty:
        m = analytics.top_medicines_by_qty[0]
        top_qty_name = traced(m.drug_name, "top_drug_by_qty")
        top_qty_units = int(traced(str(m.total_qty), "top_drug_by_qty"))

    top_rev_name = "N/A"
    top_rev_amount = "N/A"
    if analytics.top_medicines_by_revenue:
        m = analytics.top_medicines_by_revenue[0]
        top_rev_name = traced(m.drug_name, "top_drug_by_revenue")
        top_rev_amount = traced(
            fmt_rupees(m.total_revenue_paise), "top_drug_by_revenue"
        )

    # Build message matching PDF format exactly
    parts: list[str] = [
        f"Good evening! Here's today's summary for {recon.clinic_id} ({display_date}):",
        "",
        f"{total_billed} billed across {visit_count} visits, "
        f"{total_collected} collected ({collection_rate}%).",
    ]

    if recon.outstanding_paise > 0 and refund_count > 0:
        parts.append(
            f"{outstanding} is still outstanding across {pending_count} "
            f"visits, and {refunds} was refunded on {refund_count} visit."
        )
    elif recon.outstanding_paise > 0:
        parts.append(
            f"{outstanding} is still outstanding across {pending_count} visits."
        )
    elif refund_count > 0:
        parts.append(
            f"Full amount collected. {refunds} was refunded on {refund_count} visit."
        )
    else:
        parts.append("Full amount collected. No refunds today.")

    if analytics.peak_hour_label != "N/A":
        parts.extend([
            "",
            f"Busiest hour: {peak_label}, with {peak_rev} in revenue.",
        ])
    else:
        parts.extend(["", "Busiest hour: cannot be determined — no revenue data."])

    if top_qty_name != "N/A":
        parts.append("")
        parts.append(
            f"Top mover by quantity: {top_qty_name} ({top_qty_units} units)."
        )
    if top_rev_name != "N/A":
        parts.append(
            f"Top by revenue: {top_rev_name} ({top_rev_amount})."
        )

    parts.extend([
        "",
        "Note: cost data wasn't available today, so this is revenue, "
        "not profit — flagging rather than estimating.",
    ])

    recommendations = _build_recommendations(recon, analytics)

    status = "success" if recon.invalid_records == 0 else "partial"

    return NarrativeSummary(
        message="\n".join(parts),
        traced_figures=figures,
        recommendations=recommendations,
        status=status,
    )


def _build_recommendations(
    recon: ReconciliationReport,
    analytics: AnalyticsReport,
) -> list[str]:
    recs: list[str] = []

    if analytics.top_medicines_by_qty:
        top = analytics.top_medicines_by_qty[0]
        recs.append(
            f"Increase stock of {top.drug_name} — it is the highest-selling "
            f"medicine today ({top.total_qty} units)."
        )

    if analytics.peak_hour_label and analytics.peak_hour_label != "N/A":
        recs.append(
            f"Promote appointments around {analytics.peak_hour_label} — "
            f"it generated the highest revenue today."
        )

    if recon.total_billed_paise > 0:
        ratio = recon.outstanding_paise / recon.total_billed_paise
        if ratio <= 0.05:
            recs.append(
                "Outstanding amount is low, indicating efficient payment collection."
            )
        elif ratio <= 0.20:
            recs.append(
                "Consider following up on outstanding balances before end of week."
            )
        else:
            recs.append(
                "High outstanding amount — prioritise collections follow-up tomorrow."
            )

    if recon.refund_count > 0:
        recs.append(
            f"Review reason(s) for today's {recon.refund_count} refund(s) "
            f"to reduce future revenue leakage."
        )

    return recs
