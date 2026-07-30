// Deterministic client-side analytics engine — a JS mirror of the backend
// services. Lets the frontend process an uploaded log even when the FastAPI
// server is unreachable, producing identical, deterministic output.
//
// Contract: every number here is deterministic. The narrative layer only
// reads from these computed values — it never invents figures.

import { paiseToRupeesRounded } from '../utils/money.js';
import { VALID_PAYMENT_MODES } from './types.js';

function hourLabel(hour) {
  const fmt = (h) => {
    const h12 = ((h % 12) + 12) % 12 || 12;
    return `${h12}${h < 12 ? 'am' : 'pm'}`;
  };
  return `${fmt(hour)}-${fmt(hour + 1)}`;
}

function validateRecords(raw) {
  const valid = [];
  const errors = [];
  const seenVisitIds = new Set();

  raw.forEach((row, idx) => {
    const visitId = row && typeof row === 'object' && 'visit_id' in row
      ? String(row.visit_id)
      : null;

    if (!row || typeof row !== 'object') {
      errors.push({ visit_id: visitId, row_index: idx, error: 'Record is not an object' });
      return;
    }

    if (visitId && seenVisitIds.has(visitId)) {
      errors.push({
        visit_id: visitId,
        row_index: idx,
        error: `Duplicate visit_id '${visitId}' — skipping.`,
      });
      return;
    }

    const problems = [];
    if (!row.clinic_id || !String(row.clinic_id).trim()) problems.push('clinic_id is required');
    if (!row.visit_id || !String(row.visit_id).trim()) problems.push('visit_id is required');
    if (!row.timestamp || Number.isNaN(Date.parse(row.timestamp))) problems.push('timestamp is missing or invalid');
    if (!row.doctor_id || !String(row.doctor_id).trim()) problems.push('doctor_id is required');

    if (!Array.isArray(row.line_items) || row.line_items.length === 0) {
      problems.push('line_items must be a non-empty array');
    } else {
      row.line_items.forEach((li, liIdx) => {
        if (!li.drug_name || !String(li.drug_name).trim()) problems.push(`line_items[${liIdx}].drug_name is required`);
        if (typeof li.qty !== 'number' || li.qty <= 0) problems.push(`line_items[${liIdx}].qty must be a positive integer`);
        if (typeof li.unit_price_paise !== 'number' || li.unit_price_paise < 0) problems.push(`line_items[${liIdx}].unit_price_paise must be >= 0`);
      });
    }

    if (typeof row.amount_paid_paise !== 'number') problems.push('amount_paid_paise is required');
    if (typeof row.discount_paise !== 'number') row.discount_paise = 0;

    const isRefund = Boolean(row.is_refund);
    if (!isRefund) {
      if (row.payment_mode == null) problems.push('payment_mode is required for non-refund transactions');
      else if (!VALID_PAYMENT_MODES.includes(String(row.payment_mode).toLowerCase())) problems.push(`payment_mode must be one of cash, card, upi — got '${row.payment_mode}'`);
      if (typeof row.amount_paid_paise === 'number' && row.amount_paid_paise < 0) problems.push('Non-refund amount_paid_paise must be >= 0');
    } else {
      if (typeof row.amount_paid_paise === 'number' && row.amount_paid_paise > 0) problems.push('Refund record must have a non-positive amount_paid_paise');
    }

    if (problems.length > 0) {
      errors.push({ visit_id: visitId, row_index: idx, error: problems.join('; ') });
      return;
    }

    seenVisitIds.add(row.visit_id);
    valid.push(row);
  });

  return { valid, errors };
}

function computeReconciliation(valid, dateStr) {
  const billed = {};
  const collected = {};
  let refundTotal = 0;
  let refundCount = 0;
  let visitCount = 0;
  let pendingVisits = 0;
  const patientIds = new Set();
  const doctorIds = new Set();
  let clinicId = '';

  for (const r of valid) {
    clinicId = r.clinic_id;
    patientIds.add(r.visit_id);
    doctorIds.add(r.doctor_id);
    const mode = (r.payment_mode || 'unknown').toLowerCase();

    if (r.is_refund) {
      refundTotal += Math.abs(r.amount_paid_paise);
      refundCount += 1;
      collected[mode] = (collected[mode] || 0) + r.amount_paid_paise;
    } else {
      visitCount += 1;
      const lineTotal = r.line_items.reduce((s, li) => s + li.qty * li.unit_price_paise, 0);
      const billedAmount = lineTotal - (r.discount_paise || 0);
      billed[mode] = (billed[mode] || 0) + billedAmount;
      collected[mode] = (collected[mode] || 0) + r.amount_paid_paise;
      if (r.amount_paid_paise < billedAmount) pendingVisits += 1;
    }
  }

  const breakdown = VALID_PAYMENT_MODES.slice().sort().map((mode) => {
    const b = billed[mode] || 0;
    const c = collected[mode] || 0;
    return { mode, billed_paise: b, collected_paise: c, outstanding_paise: b - c };
  });

  const totalBilled = Object.values(billed).reduce((a, b) => a + b, 0);
  const totalCollected = Object.values(collected).reduce((a, b) => a + b, 0);
  const collectionRate = totalBilled > 0 ? Math.floor((totalCollected / totalBilled) * 100) : 0;

  return {
    date: dateStr,
    clinic_id: clinicId || 'UNKNOWN',
    total_billed_paise: totalBilled,
    total_collected_paise: totalCollected,
    outstanding_paise: totalBilled - totalCollected,
    total_refunds_paise: refundTotal,
    visit_count: visitCount,
    refund_count: refundCount,
    pending_visits_count: pendingVisits,
    collection_rate_pct: collectionRate,
    payment_breakdown: breakdown,
    total_transactions: valid.length,
    valid_records: valid.length,
    invalid_records: 0,
    patient_count: patientIds.size,
    doctor_count: doctorIds.size,
  };
}

function computeAnalytics(valid, dateStr, clinicId) {
  const revenueByHour = {};
  const medQty = {};
  const medRev = {};

  for (const r of valid) {
    if (r.is_refund) continue;
    const hour = new Date(r.timestamp).getUTCHours();
    const lineTotal = r.line_items.reduce((s, li) => s + li.qty * li.unit_price_paise, 0);
    const billedAmount = lineTotal - (r.discount_paise || 0);
    revenueByHour[hour] = (revenueByHour[hour] || 0) + billedAmount;
    for (const li of r.line_items) {
      const name = li.drug_name.trim().toUpperCase();
      medQty[name] = (medQty[name] || 0) + li.qty;
      medRev[name] = (medRev[name] || 0) + li.qty * li.unit_price_paise;
    }
  }

  const hours = Object.keys(revenueByHour).map(Number).sort((a, b) => a - b);
  let peakHour = -1;
  let peakRev = -1;
  hours.forEach((h) => {
    if (revenueByHour[h] > peakRev) { peakRev = revenueByHour[h]; peakHour = h; }
  });
  const hourly = hours.map((h) => ({
    hour: h,
    label: hourLabel(h),
    revenue_paise: revenueByHour[h],
    is_peak: h === peakHour,
  }));

  const topQty = Object.entries(medQty)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, qty], i) => ({
      rank: i + 1,
      drug_name: name,
      total_qty: qty,
      total_revenue_paise: medRev[name] || 0,
    }));

  const topRev = Object.entries(medRev)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, rev], i) => ({
      rank: i + 1,
      drug_name: name,
      total_qty: medQty[name] || 0,
      total_revenue_paise: rev,
    }));

  return {
    date: dateStr,
    clinic_id: clinicId,
    revenue_by_hour: hourly,
    peak_hour_label: peakHour >= 0 ? hourLabel(peakHour) : 'N/A',
    peak_hour_revenue_paise: peakRev >= 0 ? peakRev : 0,
    top_medicines_by_qty: topQty,
    top_medicines_by_revenue: topRev,
  };
}

function buildRecommendations(recon, analytics) {
  const recs = [];
  if (analytics.top_medicines_by_qty.length > 0) {
    const top = analytics.top_medicines_by_qty[0];
    recs.push(`Increase stock of ${top.drug_name} — it is the highest-selling medicine today (${top.total_qty} units).`);
  }
  if (analytics.peak_hour_label && analytics.peak_hour_label !== 'N/A') {
    recs.push(`Promote appointments around ${analytics.peak_hour_label} — it generated the highest revenue today.`);
  }
  if (recon.total_billed_paise > 0) {
    const ratio = recon.outstanding_paise / recon.total_billed_paise;
    if (ratio <= 0.05) recs.push('Outstanding amount is low, indicating efficient payment collection.');
    else if (ratio <= 0.20) recs.push('Consider following up on outstanding balances before end of week.');
    else recs.push('High outstanding amount — prioritise collections follow-up tomorrow.');
  }
  if (recon.refund_count > 0) {
    recs.push(`Review reason(s) for today's ${recon.refund_count} refund(s) to reduce future revenue leakage.`);
  }
  return recs;
}

function generateNarrative(recon, analytics) {
  const figures = [];
  const traced = (display, field) => { figures.push({ display_value: display, report_field: field }); return display; };

  if (recon.valid_records === 0) {
    return {
      message: "No billing records were found in today's log. Please verify the uploaded file and try again.",
      traced_figures: [],
      recommendations: [],
      status: 'empty',
    };
  }

  const totalBilled = traced(paiseToRupeesRounded(recon.total_billed_paise), 'total_billed');
  const totalCollected = traced(paiseToRupeesRounded(recon.total_collected_paise), 'total_collected');
  const outstanding = traced(paiseToRupeesRounded(recon.outstanding_paise), 'outstanding');
  const refunds = traced(paiseToRupeesRounded(recon.total_refunds_paise), 'refunds');
  const visitCount = recon.visit_count;
  const collectionRate = recon.collection_rate_pct;
  const pendingCount = recon.pending_visits_count;
  const refundCount = recon.refund_count;

  const peakLabel = traced(analytics.peak_hour_label, 'revenue_by_hour[max]');
  const peakRev = traced(paiseToRupeesRounded(analytics.peak_hour_revenue_paise), 'revenue_by_hour[max]');

  let topQtyName = 'N/A';
  let topQtyUnits = 0;
  if (analytics.top_medicines_by_qty.length > 0) {
    const m = analytics.top_medicines_by_qty[0];
    topQtyName = traced(m.drug_name, 'top_drug_by_qty');
    topQtyUnits = parseInt(traced(String(m.total_qty), 'top_drug_by_qty'), 10);
  }

  let topRevName = 'N/A';
  let topRevAmount = 'N/A';
  if (analytics.top_medicines_by_revenue.length > 0) {
    const m = analytics.top_medicines_by_revenue[0];
    topRevName = traced(m.drug_name, 'top_drug_by_revenue');
    topRevAmount = traced(paiseToRupeesRounded(m.total_revenue_paise), 'top_drug_by_revenue');
  }

  const parts = [
    `Good evening! Here's today's summary for ${recon.clinic_id}:`,
    '',
    `${totalBilled} billed across ${visitCount} visits, ${totalCollected} collected (${collectionRate}%).`,
  ];

  if (recon.outstanding_paise > 0 && refundCount > 0) {
    parts.push(`${outstanding} is still outstanding across ${pendingCount} visits, and ${refunds} was refunded on ${refundCount} visit.`);
  } else if (recon.outstanding_paise > 0) {
    parts.push(`${outstanding} is still outstanding across ${pendingCount} visits.`);
  } else if (refundCount > 0) {
    parts.push(`Full amount collected. ${refunds} was refunded on ${refundCount} visit.`);
  } else {
    parts.push('Full amount collected. No refunds today.');
  }

  if (analytics.peak_hour_label !== 'N/A') {
    parts.push('', `Busiest hour: ${peakLabel}, with ${peakRev} in revenue.`);
  } else {
    parts.push('', 'Busiest hour: cannot be determined — no revenue data.');
  }

  if (topQtyName !== 'N/A') {
    parts.push('', `Top mover by quantity: ${topQtyName} (${topQtyUnits} units).`);
  }
  if (topRevName !== 'N/A') {
    parts.push(`Top by revenue: ${topRevName} (${topRevAmount}).`);
  }

  parts.push('', 'Note: cost data wasn\'t available today, so this is revenue, not profit — flagging rather than estimating.');

  const recommendations = buildRecommendations(recon, analytics);
  const status = recon.invalid_records === 0 ? 'success' : 'partial';

  return {
    message: parts.join('\n'),
    traced_figures: figures,
    recommendations,
    status,
  };
}

export function processBillingLog(content, dateStr) {
  let parsed = [];
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) parsed = data;
    else if (data && typeof data === 'object') parsed = [data];
  } catch {
    parsed = [];
  }

  const { valid, errors } = validateRecords(parsed);
  const recon = computeReconciliation(valid, dateStr);
  recon.invalid_records = errors.length;
  const analytics = computeAnalytics(valid, dateStr, recon.clinic_id);
  const narrative = generateNarrative(recon, analytics);

  return {
    reconciliation: recon,
    analytics,
    narrative,
    validation_errors: errors,
  };
}
