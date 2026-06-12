import time
import uuid
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt
from pydantic import BaseModel, Field

from ..config import get_settings, Settings
from ..db import admin_txn
from ..errors import AuthError

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory storage for rate limiting: IP/phone -> list of timestamps
verify_attempts_ip = defaultdict(list)
verify_attempts_phone = defaultdict(list)

LIMIT_WINDOW = 60  # seconds
LIMIT_MAX_ATTEMPTS = 5

class LoginRequest(BaseModel):
    phone: str

class VerifyRequest(BaseModel):
    phone: str
    code: str

def check_rate_limit(key: str, store: dict):
    now = time.time()
    # Clean up old timestamps
    store[key] = [t for t in store[key] if now - t < LIMIT_WINDOW]
    if len(store[key]) >= LIMIT_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Please try again later."
        )
    store[key].append(now)

def toE164(raw: str) -> str:
    digits = "".join(c for c in raw if c.isdigit())
    if raw.strip().startswith("+") and len(digits) > 10:
        return f"+{digits}"
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return f"+{digits}" if digits else ""

@router.post("/login")
async def login(payload: LoginRequest, request: Request, settings: Settings = Depends(get_settings)):
    if not settings.beta_auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="BETA authentication is not enabled."
        )
    
    phone = toE164(payload.phone)
    if not phone or len(phone) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid phone number format."
        )
        
    # Rate limit by IP and Phone
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip, verify_attempts_ip)
    check_rate_limit(phone, verify_attempts_phone)
    
    return {"status": "otp_sent", "message": "Verification code sent successfully."}

@router.post("/verify")
async def verify(payload: VerifyRequest, request: Request, settings: Settings = Depends(get_settings)):
    if not settings.beta_auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="BETA authentication is not enabled."
        )
        
    phone = toE164(payload.phone)
    if not phone or len(phone) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid phone number format."
        )
        
    # Rate limit by IP and Phone
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip, verify_attempts_ip)
    check_rate_limit(phone, verify_attempts_phone)
    
    if payload.code != settings.beta_login_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code."
        )
        
    # Find or create user in database
    async with admin_txn() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (supabase_uid, phone) VALUES ($1, $2)
            ON CONFLICT (phone) DO UPDATE
              SET supabase_uid = COALESCE(users.supabase_uid, EXCLUDED.supabase_uid)
            RETURNING id, phone, supabase_uid
            """,
            uuid.uuid4(), phone,
        )
        
    # Generate signed HS256 JWT
    secret = settings.supabase_jwt_secret or "dummy_secret_for_dev_only"
    jwt_payload = {
        "sub": str(row["supabase_uid"]),
        "phone": row["phone"],
        "aud": "authenticated",
        "role": "authenticated",
        "exp": int(time.time()) + 30 * 24 * 3600, # 30 days
    }
    token = jwt.encode(jwt_payload, secret, algorithm="HS256")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(row["id"]),
            "phone": row["phone"]
        }
    }
