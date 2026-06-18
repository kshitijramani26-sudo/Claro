"""Server-enforced role permissions.

Roles: owner (everything), co_owner (everything except deleting the business or
changing/removing the owner & other co-owners), staff (scoped — own bills/khata/
customers, own staff record, billing + settle, NO analytics, NO cost/profit).

These dependencies are the source of truth — the UI also gates, but a staff member
must never read owner-only data by calling the API directly.
"""
from collections.abc import Callable

from fastapi import Depends

from .auth import CurrentBusiness, get_current_business
from .errors import ForbiddenError


def require_roles(*roles: str) -> Callable[..., object]:
    async def _dep(biz: CurrentBusiness = Depends(get_current_business)) -> CurrentBusiness:
        if biz.role not in roles:
            raise ForbiddenError()
        return biz

    return _dep


# Owner-only (delete business, manage owner/co-owners, transfer).
require_owner = require_roles("owner")
# Owner or co-owner (settings, payment methods, full visibility, analytics).
require_manager = require_roles("owner", "co_owner")
