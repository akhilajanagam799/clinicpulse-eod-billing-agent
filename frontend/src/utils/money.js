// Money formatting helpers — mirror of backend/utils/money.py.
// All monetary values are integer paise; never use floats for arithmetic.

export function paiseToRupees(paise) {
  const sign = paise < 0 ? '-' : '';
  const rupees = Math.floor(Math.abs(paise) / 100);
  const paiseRem = Math.abs(paise) % 100;
  return `${sign}₹${rupees.toLocaleString('en-IN')}.${String(paiseRem).padStart(2, '0')}`;
}

export function paiseToRupeesRounded(paise) {
  const sign = paise < 0 ? '-' : '';
  const rupees = Math.round(Math.abs(paise) / 100);
  return `${sign}₹${rupees.toLocaleString('en-IN')}`;
}
