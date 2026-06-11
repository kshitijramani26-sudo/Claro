"""Typed domain errors (billing_rules.md §8) — clean 4xx, never 500."""
from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    status = 422
    code = "domain_error"

    def __init__(self, message: str, **details: object) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class InsufficientStockError(DomainError):
    status = 409
    code = "insufficient_stock"

    def __init__(self, item_id: UUID, requested: int, available: int) -> None:
        super().__init__(
            f"Not enough stock: requested {requested}, only {available} left",
            item_id=str(item_id), requested=requested, available=available,
        )


class MissingCustomerForCreditError(DomainError):
    status = 422
    code = "missing_customer_for_credit"

    def __init__(self) -> None:
        super().__init__("A customer is required for a credit bill")


class CrossBusinessReferenceError(DomainError):
    status = 403
    code = "cross_business_reference"

    def __init__(self, entity: str, entity_id: object) -> None:
        super().__init__(f"{entity} not found in this business", entity=entity, id=str(entity_id))


class EmptyBillError(DomainError):
    status = 422
    code = "empty_bill"

    def __init__(self) -> None:
        super().__init__("A bill needs at least one item")


class InvalidLineError(DomainError):
    status = 422
    code = "invalid_line"


class DiscountExceedsSubtotalError(DomainError):
    status = 422
    code = "discount_exceeds_subtotal"

    def __init__(self) -> None:
        super().__init__("Discount cannot exceed the subtotal")


class NotFoundError(DomainError):
    status = 404
    code = "not_found"


class NoBusinessError(DomainError):
    """First login — onboarding must create the business profile."""
    status = 404
    code = "no_business"

    def __init__(self) -> None:
        super().__init__("No business profile yet")


class AuthError(DomainError):
    status = 401
    code = "unauthorized"


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content={"error": exc.code, "message": exc.message, **({"details": exc.details} if exc.details else {})},
        )
