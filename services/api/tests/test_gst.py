"""GST engine unit tests — pure math, no DB."""
import pytest

from app.errors import DiscountExceedsSubtotalError, EmptyBillError
from app.services.gst import LineIn, compute_bill


def line(price: int, qty: int = 1, rate: int = 1800, inclusive: bool = True, name: str = "x") -> LineIn:
    return LineIn(name=name, qty=qty, unit_price_paise=price, tax_rate_bps=rate, inclusive=inclusive)


def test_inclusive_back_calculation_preserves_mrp():
    # ₹118 MRP at 18% → taxable ₹100, tax ₹18, line total still ₹118
    t = compute_bill([line(11800)], gst_mode="gst", business_state="27", place_of_supply="27")
    assert t.lines[0].taxable_paise == 10000
    assert t.lines[0].tax_paise == 1800
    assert t.lines[0].line_total_paise == 11800
    assert t.grand_total_paise == 11800


def test_exclusive_adds_tax_on_top():
    t = compute_bill([line(10000, inclusive=False)], gst_mode="gst", business_state="27", place_of_supply="27")
    assert t.lines[0].taxable_paise == 10000
    assert t.lines[0].tax_paise == 1800
    assert t.grand_total_paise == 11800


def test_intra_split_absorbs_odd_paise_into_cgst():
    # Pick a price whose tax is odd: exclusive ₹1.01 at 5% → tax 5.05 → round-half-even = 5 paise (odd)
    t = compute_bill([line(101, rate=500, inclusive=False)], gst_mode="gst", business_state="27", place_of_supply="27")
    assert t.tax_total_paise % 2 == 1
    assert t.cgst_paise + t.sgst_paise == t.tax_total_paise
    assert t.cgst_paise == t.sgst_paise + 1
    assert t.igst_paise == 0


def test_inter_state_uses_igst():
    t = compute_bill([line(11800)], gst_mode="gst", business_state="27", place_of_supply="07")
    assert t.tax_kind == "inter"
    assert t.igst_paise == t.tax_total_paise == 1800
    assert t.cgst_paise == t.sgst_paise == 0


def test_non_gst_mode_zeroes_everything():
    t = compute_bill([line(11800)], gst_mode="non_gst", business_state="27", place_of_supply="27")
    assert t.tax_kind == "none"
    assert t.tax_total_paise == t.cgst_paise == t.sgst_paise == t.igst_paise == 0
    assert t.grand_total_paise == 11800


def test_zero_rate_item_in_gst_bill():
    t = compute_bill([line(2800, rate=0)], gst_mode="gst", business_state="27", place_of_supply="27")
    assert t.tax_total_paise == 0
    assert t.grand_total_paise == 2800


def test_discount_allocated_before_tax_and_sums_exactly():
    items = [line(11800, name="a"), line(5900, name="b")]
    t = compute_bill(items, gst_mode="gst", business_state="27", place_of_supply="27", discount_paise=1000)
    assert t.discount_paise == 1000
    assert t.subtotal_paise == 17700
    # grand = subtotal - discount for inclusive pricing
    assert t.grand_total_paise == 16700
    assert t.cgst_paise + t.sgst_paise == t.tax_total_paise


def test_discount_exceeding_subtotal_rejected():
    with pytest.raises(DiscountExceedsSubtotalError):
        compute_bill([line(100)], gst_mode="gst", business_state="27", place_of_supply="27", discount_paise=200)


def test_empty_bill_rejected():
    with pytest.raises(EmptyBillError):
        compute_bill([], gst_mode="gst", business_state="27", place_of_supply="27")


def test_mixed_rates_sum_correctly():
    items = [
        line(11800, rate=1800, name="soap"),       # tax 1800
        line(1400, rate=1200, name="maggi"),       # taxable 1250, tax 150
        line(2800, rate=0, name="salt"),           # no tax
    ]
    t = compute_bill(items, gst_mode="gst", business_state="27", place_of_supply="27")
    assert t.tax_total_paise == sum(l.tax_paise for l in t.lines)
    assert t.grand_total_paise == sum(l.line_total_paise for l in t.lines)
    assert t.cgst_paise + t.sgst_paise == t.tax_total_paise
