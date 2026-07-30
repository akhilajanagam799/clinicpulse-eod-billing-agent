// Shared type definitions (JSDoc-style) for the processing result.
// Kept as plain JS objects with comments for clarity.

/**
 * @typedef {Object} PaymentModeBreakdown
 * @property {string} mode
 * @property {number} billed_paise
 * @property {number} collected_paise
 * @property {number} outstanding_paise
 */

/**
 * @typedef {Object} ReconciliationReport
 * @property {string} date
 * @property {string} clinic_id
 * @property {number} total_billed_paise
 * @property {number} total_collected_paise
 * @property {number} outstanding_paise
 * @property {number} total_refunds_paise
 * @property {number} visit_count
 * @property {number} refund_count
 * @property {number} pending_visits_count
 * @property {number} collection_rate_pct
 * @property {PaymentModeBreakdown[]} payment_breakdown
 * @property {number} total_transactions
 * @property {number} valid_records
 * @property {number} invalid_records
 * @property {number} patient_count
 * @property {number} doctor_count
 */

/**
 * @typedef {Object} HourlyRevenue
 * @property {number} hour
 * @property {string} label
 * @property {number} revenue_paise
 * @property {boolean} is_peak
 */

/**
 * @typedef {Object} MedicineRanking
 * @property {number} rank
 * @property {string} drug_name
 * @property {number} total_qty
 * @property {number} total_revenue_paise
 */

/**
 * @typedef {Object} AnalyticsReport
 * @property {string} date
 * @property {string} clinic_id
 * @property {HourlyRevenue[]} revenue_by_hour
 * @property {string} peak_hour_label
 * @property {number} peak_hour_revenue_paise
 * @property {MedicineRanking[]} top_medicines_by_qty
 * @property {MedicineRanking[]} top_medicines_by_revenue
 */

/**
 * @typedef {Object} TracedFigure
 * @property {string} display_value
 * @property {string} report_field
 */

/**
 * @typedef {Object} NarrativeSummary
 * @property {string} message
 * @property {TracedFigure[]} traced_figures
 * @property {string[]} recommendations
 * @property {string} status
 */

/**
 * @typedef {Object} ValidationError
 * @property {string|null} visit_id
 * @property {number} row_index
 * @property {string} error
 */

/**
 * @typedef {Object} ProcessingResult
 * @property {ReconciliationReport} reconciliation
 * @property {AnalyticsReport} analytics
 * @property {NarrativeSummary} narrative
 * @property {ValidationError[]} validation_errors
 */

export const VALID_PAYMENT_MODES = ['cash', 'card', 'upi'];
