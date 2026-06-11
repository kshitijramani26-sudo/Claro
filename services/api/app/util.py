"""Small shared helpers: IST time windows, phone normalization, half-even rounding."""
from datetime import date, datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))


def ist_now() -> datetime:
    return datetime.now(tz=IST)


def ist_today() -> date:
    return ist_now().date()


def ist_day_start_utc(d: date | None = None) -> datetime:
    """UTC instant when the given IST calendar day begins."""
    d = d or ist_today()
    return datetime(d.year, d.month, d.day, tzinfo=IST).astimezone(timezone.utc)


def ist_month_start_utc() -> datetime:
    t = ist_today()
    return datetime(t.year, t.month, 1, tzinfo=IST).astimezone(timezone.utc)


def month_label() -> str:
    return ist_now().strftime("%B %Y")


def normalize_phone(raw: str) -> str:
    """Best-effort +91 E.164. Keeps an existing +country prefix; strips punctuation."""
    digits = "".join(ch for ch in raw if ch.isdigit())
    if raw.strip().startswith("+") and len(digits) > 10:
        return "+" + digits
    if len(digits) == 10:
        return "+91" + digits
    if len(digits) == 12 and digits.startswith("91"):
        return "+" + digits
    return ("+" + digits) if digits else ""


def round_half_even(numerator: int, denominator: int) -> int:
    """Banker's rounding of numerator/denominator without floats."""
    q, r = divmod(numerator, denominator)
    twice = 2 * r
    if twice > denominator or (twice == denominator and q % 2 == 1):
        q += 1
    return q
