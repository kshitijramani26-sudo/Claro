"""The GST engine (docs §6) — pure functions, integer paise only.

Per-item slabs (0/5/12/18/28% as basis points) with inclusive/exclusive pricing:
  inclusive:  taxable = round(gross * 10000 / (10000 + rate));  tax = gross - taxable
              → printed line total == the MRP the shopkeeper typed
  exclusive:  taxable = gross;  tax = round(gross * rate / 10000)  added on top

tax_kind: place_of_supply == business state → 'intra' (CGST+SGST, odd paise into
CGST so cgst+sgst == tax_total exactly); different state → 'inter' (IGST = full).

Discounts are allocated across lines proportionally by gross (largest-remainder,
so the allocation sums exactly), applied BEFORE tax — GST is computed on the
discounted base, as required for tax-compliant invoices.
"""
from dataclasses import dataclass
from typing import Literal

from ..errors import DiscountExceedsSubtotalError, EmptyBillError, InvalidLineError
from ..util import round_half_even

GstMode = Literal["gst", "non_gst"]
TaxKind = Literal["intra", "inter", "none"]


@dataclass(frozen=True)
class LineIn:
    name: str
    qty: int
    unit_price_paise: int
    tax_rate_bps: int
    inclusive: bool
    hsn_code: str = ""
    inventory_item_id: object = None


@dataclass(frozen=True)
class LineOut:
    name: str
    hsn_code: str
    qty: int
    unit_price_paise: int
    tax_rate_bps: int
    taxable_paise: int
    tax_paise: int
    line_total_paise: int
    inventory_item_id: object = None


@dataclass(frozen=True)
class BillTotals:
    gst_mode: GstMode
    tax_kind: TaxKind
    subtotal_paise: int
    discount_paise: int
    taxable_paise: int
    cgst_paise: int
    sgst_paise: int
    igst_paise: int
    tax_total_paise: int
    grand_total_paise: int
    lines: tuple[LineOut, ...]


def _allocate_discount(grosses: list[int], discount: int) -> list[int]:
    """Largest-remainder proportional allocation; sums exactly to discount."""
    total = sum(grosses)
    if discount == 0 or total == 0:
        return [0] * len(grosses)
    shares = [(discount * g) // total for g in grosses]
    remainders = [(discount * g) % total for g in grosses]
    leftover = discount - sum(shares)
    for i in sorted(range(len(grosses)), key=lambda i: remainders[i], reverse=True)[:leftover]:
        shares[i] += 1
    return shares


def compute_bill(
    items: list[LineIn],
    *,
    gst_mode: GstMode,
    business_state: str,
    place_of_supply: str,
    discount_paise: int = 0,
) -> BillTotals:
    if not items:
        raise EmptyBillError()
    for line in items:
        if line.qty <= 0 or line.unit_price_paise < 0:
            raise InvalidLineError(f"Invalid line: {line.name!r} qty={line.qty} price={line.unit_price_paise}")

    grosses = [line.qty * line.unit_price_paise for line in items]
    subtotal = sum(grosses)
    if discount_paise > subtotal:
        raise DiscountExceedsSubtotalError()

    tax_kind: TaxKind = "none"
    if gst_mode == "gst":
        tax_kind = "intra" if place_of_supply == business_state else "inter"

    discounts = _allocate_discount(grosses, discount_paise)

    out: list[LineOut] = []
    taxable_sum = 0
    tax_sum = 0
    for line, gross, disc in zip(items, grosses, discounts):
        base = gross - disc
        if gst_mode == "gst" and line.tax_rate_bps > 0:
            if line.inclusive:
                taxable = round_half_even(base * 10000, 10000 + line.tax_rate_bps)
                tax = base - taxable
                line_total = base
            else:
                taxable = base
                tax = round_half_even(base * line.tax_rate_bps, 10000)
                line_total = base + tax
        else:
            taxable, tax, line_total = base, 0, base
        taxable_sum += taxable
        tax_sum += tax
        out.append(LineOut(
            name=line.name, hsn_code=line.hsn_code, qty=line.qty,
            unit_price_paise=line.unit_price_paise, tax_rate_bps=line.tax_rate_bps if gst_mode == "gst" else 0,
            taxable_paise=taxable, tax_paise=tax, line_total_paise=line_total,
            inventory_item_id=line.inventory_item_id,
        ))

    cgst = sgst = igst = 0
    if tax_kind == "intra":
        cgst = sgst = tax_sum // 2
        cgst += tax_sum - (cgst + sgst)  # absorb odd paise into CGST
    elif tax_kind == "inter":
        igst = tax_sum

    grand = taxable_sum + tax_sum
    assert grand >= 0
    assert cgst + sgst + igst == tax_sum

    return BillTotals(
        gst_mode=gst_mode, tax_kind=tax_kind,
        subtotal_paise=subtotal, discount_paise=discount_paise,
        taxable_paise=taxable_sum, cgst_paise=cgst, sgst_paise=sgst, igst_paise=igst,
        tax_total_paise=tax_sum, grand_total_paise=grand, lines=tuple(out),
    )


def tax_summary_by_rate(lines: tuple[LineOut, ...]) -> list[tuple[int, int, int]]:
    """[(rate_bps, taxable, tax)] for the invoice tax table, ascending by rate."""
    agg: dict[int, list[int]] = {}
    for line in lines:
        if line.tax_paise > 0:
            entry = agg.setdefault(line.tax_rate_bps, [0, 0])
            entry[0] += line.taxable_paise
            entry[1] += line.tax_paise
    return [(rate, t[0], t[1]) for rate, t in sorted(agg.items())]
