"""Pydantic v2 request/response models. All money fields are integer paise."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

GstMode = Literal["gst", "non_gst"]
TaxKind = Literal["intra", "inter", "none"]
PaymentMode = Literal["CASH", "UPI", "CREDIT"]
Period = Literal["today", "week", "month"]


# ── business ──
class BusinessCreate(BaseModel):
    name: str = Field(min_length=1)
    owner_name: str = Field(min_length=1)
    industry: str = "Other"
    state_code: str = "27"
    address: str = ""
    gst_registered: bool = False
    gstin: str = ""
    gst_default_mode: GstMode | None = None  # default: gst if registered else non_gst
    price_includes_tax: bool = True
    invoice_prefix: str = "INV-"
    email: str = ""


class BusinessPatch(BaseModel):
    name: str | None = None
    owner_name: str | None = None
    industry: str | None = None
    state_code: str | None = None
    address: str | None = None
    gst_registered: bool | None = None
    gstin: str | None = None
    gst_default_mode: GstMode | None = None
    price_includes_tax: bool | None = None
    invoice_prefix: str | None = None
    low_stock_default: int | None = None
    email: str | None = None


class BusinessRead(BaseModel):
    id: UUID
    name: str
    owner_name: str
    industry: str
    state_code: str
    address: str
    gst_registered: bool
    gstin: str
    gst_default_mode: GstMode
    price_includes_tax: bool
    invoice_prefix: str
    low_stock_default: int
    email: str
    phone: str  # from the login user


# ── payment methods ──
class PaymentMethodCreate(BaseModel):
    upi_id: str = ""
    label: str = ""
    qr_image_url: str | None = None
    is_default: bool = False


class PaymentMethodPatch(BaseModel):
    upi_id: str | None = None
    label: str | None = None
    qr_image_url: str | None = None


class PaymentMethodRead(BaseModel):
    id: UUID
    type: str
    upi_id: str
    qr_image_url: str | None
    label: str
    is_default: bool


# ── inventory ──
class InventoryCreate(BaseModel):
    name: str = Field(min_length=1)
    hsn_code: str = ""
    tax_rate_bps: Literal[0, 500, 1200, 1800, 2800] = 0
    price_paise: int = Field(ge=0)
    price_is_tax_inclusive: bool | None = None  # default: business pref
    cost_paise: int = Field(default=0, ge=0)
    qty_on_hand: int = Field(default=0, ge=0)
    low_stock_threshold: int | None = None  # default: business low_stock_default


class InventoryPatch(BaseModel):
    name: str | None = None
    hsn_code: str | None = None
    tax_rate_bps: Literal[0, 500, 1200, 1800, 2800] | None = None
    price_paise: int | None = Field(default=None, ge=0)
    price_is_tax_inclusive: bool | None = None
    cost_paise: int | None = Field(default=None, ge=0)
    qty_on_hand: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = None


class InventoryRead(BaseModel):
    id: UUID
    name: str
    hsn_code: str
    tax_rate_bps: int
    price_paise: int
    price_is_tax_inclusive: bool
    cost_paise: int
    qty_on_hand: int
    low_stock_threshold: int
    low: bool


class InventoryStatsRead(BaseModel):
    total_value_paise: int
    skus: int
    low_count: int


# ── bills ──
class BillLineCreate(BaseModel):
    inventory_item_id: UUID | None = None  # None ⇒ ad-hoc line, no stock effect
    name: str = Field(min_length=1)
    qty: int = Field(gt=0)
    unit_price_paise: int = Field(ge=0)
    # Ad-hoc lines only (inventory lines snapshot these from the item):
    tax_rate_bps: Literal[0, 500, 1200, 1800, 2800] = 0
    price_is_tax_inclusive: bool | None = None  # default: business pref


class BillCreate(BaseModel):
    request_id: UUID
    items: list[BillLineCreate]
    payment_mode: PaymentMode
    customer_id: UUID | None = None
    customer_name: str = ""
    customer_phone: str = ""
    customer_state_code: str | None = None  # place of supply override (GST)
    staff_id: UUID | None = None
    gst_mode: GstMode | None = None  # default: business.gst_default_mode (forced non_gst if unregistered)
    payment_method_id: UUID | None = None
    discount_paise: int = Field(default=0, ge=0)
    note: str | None = None


class BillItemRead(BaseModel):
    name: str
    hsn_code: str
    qty: int
    unit_price_paise: int
    tax_rate_bps: int
    taxable_paise: int
    tax_paise: int
    line_total_paise: int


class BillRead(BaseModel):
    id: UUID
    invoice_no: str
    gst_mode: GstMode
    tax_kind: TaxKind
    place_of_supply_state: str
    subtotal_paise: int
    discount_paise: int
    taxable_paise: int
    cgst_paise: int
    sgst_paise: int
    igst_paise: int
    tax_total_paise: int
    grand_total_paise: int
    payment_mode: PaymentMode
    payment_method_id: UUID | None
    customer_id: UUID | None
    customer_name: str
    staff_id: UUID | None
    note: str | None
    created_at: datetime
    items: list[BillItemRead]


class UpiRead(BaseModel):
    upi_id: str
    label: str
    deeplink: str
    qr_png_base64: str


# ── home feed ──
class SummaryRead(BaseModel):
    todays_sales_paise: int
    todays_bills: int
    pending_khata_paise: int
    low_stock: int
    month_sales_paise: int
    month_label: str
    top_staff: str


class ActivityRead(BaseModel):
    id: str
    title: str
    sub: str
    amount_paise: int
    kind: Literal["sale", "credit", "settle", "advance", "salary"]
    at: datetime
    bill_id: str | None = None  # tap → invoice summary, when this row has an invoice


# ── khata ──
class KhataCustomerRead(BaseModel):
    id: UUID
    name: str
    phone: str
    outstanding_paise: int
    updated_at: datetime


class KhataListRead(BaseModel):
    total_outstanding_paise: int
    customers: list[KhataCustomerRead]


class KhataEntryRead(BaseModel):
    id: int
    label: str
    debit_paise: int
    credit_paise: int
    at: datetime


class KhataDetailRead(BaseModel):
    customer: KhataCustomerRead
    entries: list[KhataEntryRead]  # newest first


class KhataCreditCreate(BaseModel):
    customer_id: UUID | None = None
    name: str = ""
    phone: str = ""
    amount_paise: int = Field(gt=0)
    note: str = ""


class SettleCreate(BaseModel):
    amount_paise: int | None = Field(default=None, gt=0)  # None ⇒ settle in full
    note: str = "Settled up"


class ReminderRead(BaseModel):
    text: str
    wa_url: str


# ── staff ──
class StaffCreate(BaseModel):
    name: str = Field(min_length=1)
    role: str = ""
    phone: str = ""
    salary_paise: int = Field(default=0, ge=0)


class StaffPatch(BaseModel):
    name: str | None = None
    role: str | None = None
    phone: str | None = None
    salary_paise: int | None = Field(default=None, ge=0)


class StaffRead(BaseModel):
    id: UUID
    name: str
    role: str
    phone: str
    salary_paise: int
    advance_outstanding_paise: int
    present_today: bool


class AttendanceCreate(BaseModel):
    status: Literal["present", "absent"]
    date: str | None = None  # ISO date; default today (IST)


class AdvanceCreate(BaseModel):
    amount_paise: int = Field(gt=0)
    note: str = ""


class StaffAdvanceRead(BaseModel):
    id: int
    label: str
    amount_paise: int
    repaid: bool
    at: datetime


class StaffDetailRead(BaseModel):
    staff: StaffRead
    sales_paise: int
    bills: int
    avg_bill_paise: int
    attendance14: list[bool]  # oldest → newest
    advances: list[StaffAdvanceRead]


# ── analytics ──
class AnalyticsRead(BaseModel):
    net_pnl_paise: int
    sales_paise: int
    credit_outstanding_paise: int
    inventory_value_paise: int
    top_staff: str
    spark: list[int]


class BestSellingRead(BaseModel):
    id: UUID
    name: str
    units: int
    revenue_paise: int


# ── customers ──
class CustomerRead(BaseModel):
    id: UUID
    name: str
    phone: str
    state_code: str | None
    outstanding_paise: int
