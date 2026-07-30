"""
Deterministic analytics service.
Computes revenue-by-hour and medicine rankings from validated records.
Never calls an LLM.
"""
from __future__ import annotations
from collections import defaultdict

from app.models.billing import VisitRecord
from app.schemas.report import (
    AnalyticsReport,
    HourlyRevenue,
    MedicineRanking,
)


def _hour_label(hour: int) -> str:
    """'9am-10am', '12pm-1pm', etc."""
    def fmt(h: int) -> str:
        h12 = h % 12 or 12
        suffix = "am" if h < 12 else "pm"
        return f"{h12}{suffix}"
    return f"{fmt(hour)}-{fmt(hour + 1)}"


def compute_analytics(
    valid_records: list[VisitRecord],
    date_str: str,
    clinic_id: str,
) -> AnalyticsReport:
    revenue_by_hour: dict[int, int] = defaultdict(int)
    medicine_qty: dict[str, int] = defaultdict(int)
    medicine_revenue: dict[str, int] = defaultdict(int)

    for rec in valid_records:
        if rec.is_refund:
            continue

        # Use UTC hour for bucketing (as per billing log schema note)
        from datetime import timezone
        hour = rec.timestamp.astimezone(timezone.utc).hour

        line_total = sum(
            li.qty * li.unit_price_paise for li in rec.line_items
        )
        billed_amount = line_total - rec.discount_paise
        revenue_by_hour[hour] += billed_amount

        for li in rec.line_items:
            name = li.drug_name.strip().upper()
            medicine_qty[name] += li.qty
            medicine_revenue[name] += li.qty * li.unit_price_paise

    hours_sorted = sorted(revenue_by_hour.keys())
    peak_hour = max(revenue_by_hour, key=revenue_by_hour.get) if revenue_by_hour else -1
    peak_revenue = revenue_by_hour.get(peak_hour, 0)

    hourly: list[HourlyRevenue] = [
        HourlyRevenue(
            hour=h,
            label=_hour_label(h),
            revenue_paise=revenue_by_hour[h],
            is_peak=(h == peak_hour),
        )
        for h in hours_sorted
    ]

    top_qty: list[MedicineRanking] = [
        MedicineRanking(
            rank=i + 1,
            drug_name=name,
            total_qty=qty,
            total_revenue_paise=medicine_revenue[name],
        )
        for i, (name, qty) in enumerate(
            sorted(medicine_qty.items(), key=lambda x: x[1], reverse=True)[:10]
        )
    ]

    top_rev: list[MedicineRanking] = [
        MedicineRanking(
            rank=i + 1,
            drug_name=name,
            total_qty=medicine_qty[name],
            total_revenue_paise=rev,
        )
        for i, (name, rev) in enumerate(
            sorted(medicine_revenue.items(), key=lambda x: x[1], reverse=True)[:10]
        )
    ]

    return AnalyticsReport(
        date=date_str,
        clinic_id=clinic_id,
        revenue_by_hour=hourly,
        peak_hour_label=_hour_label(peak_hour) if peak_hour >= 0 else "N/A",
        peak_hour_revenue_paise=peak_revenue,
        top_medicines_by_qty=top_qty,
        top_medicines_by_revenue=top_rev,
    )
