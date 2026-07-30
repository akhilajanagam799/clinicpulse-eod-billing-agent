"""Money formatting helpers. All values are integer paise; 1 rupee = 100 paise."""


def fmt_rupees(paise: int) -> str:
    """Return a ₹-prefixed whole-rupee string with comma separators."""
    sign = "-" if paise < 0 else ""
    rupees = abs(round(paise / 100))
    # Simple comma formatting (works for Indian numbers up to crores in this range)
    formatted = f"{rupees:,}"
    return f"{sign}₹{formatted}"
