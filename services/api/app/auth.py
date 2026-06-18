"""Supabase JWT auth → User → Business scoping.

Accepted tokens:
  • Supabase access token (phone OTP login). Verified via the project JWKS
    (RS256/ES256) or the legacy HS256 secret when SUPABASE_JWT_SECRET is set.
  • "dev:<E.164 phone>" when AUTH_DEV_BYPASS=true — local/e2e testing before
    an SMS provider is configured. Never enable in production.

get_current_user resolves/creates the users row; get_current_business loads the
caller's business and is the scope for every domain query.
"""
import time
from dataclasses import dataclass
from uuid import UUID

import httpx
from fastapi import Depends, Header
from jose import JWTError, jwt

from .config import get_settings
from .db import admin_txn
from .errors import AuthError, NoBusinessError

_jwks_cache: dict[str, object] = {"keys": None, "fetched": 0.0}
_JWKS_TTL = 3600.0


@dataclass
class CurrentUser:
    id: UUID
    phone: str
    supabase_uid: UUID | None


@dataclass
class CurrentBusiness:
    id: UUID
    user: CurrentUser
    row: dict
    role: str = "owner"               # 'owner' | 'co_owner' | 'staff'
    member_id: UUID | None = None     # the caller's business_members row
    linked_staff_id: UUID | None = None  # for staff members → their staff record

    @property
    def is_staff(self) -> bool:
        return self.role == "staff"

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"


async def _jwks() -> dict:
    now = time.monotonic()
    if _jwks_cache["keys"] is None or now - float(_jwks_cache["fetched"]) > _JWKS_TTL:
        url = f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            _jwks_cache["keys"] = resp.json()
            _jwks_cache["fetched"] = now
    return _jwks_cache["keys"]  # type: ignore[return-value]


async def _verify_supabase_jwt(token: str) -> dict:
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise AuthError("Invalid token") from exc

    alg = header.get("alg", "")
    try:
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise AuthError("HS256 token but no SUPABASE_JWT_SECRET configured")
            return jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
        keys = await _jwks()
        return jwt.decode(token, keys, algorithms=[alg], audience="authenticated")
    except JWTError as exc:
        raise AuthError("Invalid or expired token") from exc


async def get_current_user(authorization: str = Header(default="")) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise AuthError("Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    settings = get_settings()

    supabase_uid: UUID | None = None
    if settings.auth_dev_bypass and token.startswith("dev:"):
        phone = token.removeprefix("dev:").strip()
        if not phone.startswith("+") or len(phone) < 8:
            raise AuthError("Dev token must be dev:+<E.164 phone>")
    else:
        claims = await _verify_supabase_jwt(token)
        supabase_uid = UUID(claims["sub"])
        phone = str(claims.get("phone") or "")
        if phone and not phone.startswith("+"):
            phone = "+" + phone
        if not phone:
            raise AuthError("Token has no phone claim")

    async with admin_txn() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (supabase_uid, phone) VALUES ($1, $2)
            ON CONFLICT (phone) DO UPDATE
              SET supabase_uid = COALESCE(users.supabase_uid, EXCLUDED.supabase_uid)
            RETURNING id, phone, supabase_uid
            """,
            supabase_uid, phone,
        )
    return CurrentUser(id=row["id"], phone=row["phone"], supabase_uid=row["supabase_uid"])


async def get_current_business(user: CurrentUser = Depends(get_current_user)) -> CurrentBusiness:
    """Resolve the caller's business AND role. Owner = owns a business; otherwise a
    member is matched by phone (their user_id + status are linked on first login).
    The owner is also materialised as a 'owner' member row for attribution/audit."""
    async with admin_txn() as conn:
        biz = await conn.fetchrow("SELECT * FROM businesses WHERE user_id = $1", user.id)
        if biz is not None:
            member = await conn.fetchrow(
                """INSERT INTO business_members (business_id, user_id, phone, name, role, status)
                   VALUES ($1, $2, $3, $4, 'owner', 'active')
                   ON CONFLICT (business_id, phone)
                   DO UPDATE SET user_id = EXCLUDED.user_id, role = 'owner', status = 'active'
                   RETURNING id, linked_staff_id""",
                biz["id"], user.id, user.phone, biz["owner_name"],
            )
            return CurrentBusiness(
                id=biz["id"], user=user, row=dict(biz),
                role="owner", member_id=member["id"], linked_staff_id=None,
            )

        m = await conn.fetchrow(
            "SELECT * FROM business_members WHERE phone = $1 ORDER BY created_at LIMIT 1", user.phone
        )
        if m is None:
            raise NoBusinessError()
        if m["user_id"] is None or m["status"] != "active":
            m = await conn.fetchrow(
                "UPDATE business_members SET user_id = $1, status = 'active' WHERE id = $2 RETURNING *",
                user.id, m["id"],
            )
        biz = await conn.fetchrow("SELECT * FROM businesses WHERE id = $1", m["business_id"])
        if biz is None:
            raise NoBusinessError()
        return CurrentBusiness(
            id=biz["id"], user=user, row=dict(biz),
            role=m["role"], member_id=m["id"], linked_staff_id=m["linked_staff_id"],
        )
