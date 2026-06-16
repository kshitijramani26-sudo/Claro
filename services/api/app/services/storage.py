"""Optional Supabase Storage upload for hosted invoice PDFs (WhatsApp links).

Gracefully no-ops when the service-role key isn't configured — the caller then
returns a null link and the app falls back to the native share sheet (which
attaches the actual PDF file).
"""
import logging
import re

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


def supabase_base_url() -> str | None:
    """The project's Supabase URL. Prefer SUPABASE_URL, else derive the project
    ref from DATABASE_URL (so storage works with only the service-role key set)."""
    s = get_settings()
    if s.supabase_url:
        return s.supabase_url.rstrip("/")
    du = s.database_url or ""
    m = re.search(r"db\.([a-z0-9]{16,})\.supabase\.co", du) or re.search(r"postgres\.([a-z0-9]{16,})[:@]", du)
    return f"https://{m.group(1)}.supabase.co" if m else None


def storage_enabled() -> bool:
    s = get_settings()
    return bool(s.supabase_service_role_key and supabase_base_url())


async def upload_invoice_pdf(path: str, pdf: bytes) -> tuple[str | None, str]:
    """Upsert the PDF into the public invoice bucket. Returns (public_url, reason);
    url is None on any failure, reason names the cause for diagnostics."""
    s = get_settings()
    base = supabase_base_url()
    if not s.supabase_service_role_key:
        logger.warning("invoice PDF host skipped: SUPABASE_SERVICE_ROLE_KEY not set")
        return None, "no_service_key"
    if not base:
        logger.warning("invoice PDF host skipped: could not resolve Supabase URL (set SUPABASE_URL)")
        return None, "no_supabase_url"
    url = f"{base}/storage/v1/object/{s.invoice_bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {s.supabase_service_role_key}",
        "apikey": s.supabase_service_role_key,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
        "cache-control": "3600",
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, content=pdf, headers=headers)
    except Exception as exc:  # network/DNS failure
        logger.warning("invoice PDF upload error: %s", exc)
        return None, "upload_error"
    if resp.status_code not in (200, 201):
        logger.warning("invoice PDF upload failed: %s %s", resp.status_code, resp.text[:200])
        return None, f"http_{resp.status_code}:{resp.text[:120]}"
    return f"{base}/storage/v1/object/public/{s.invoice_bucket}/{path}", "ok"
