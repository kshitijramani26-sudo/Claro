"""Optional Supabase Storage upload for hosted invoice PDFs (WhatsApp links).

Gracefully no-ops when the service-role key isn't configured — the caller then
returns a null link and the app falls back to the native share sheet (which
attaches the actual PDF file).
"""
import httpx

from ..config import get_settings


def storage_enabled() -> bool:
    s = get_settings()
    return bool(s.supabase_url and s.supabase_service_role_key)


async def upload_invoice_pdf(path: str, pdf: bytes) -> str | None:
    """Upsert the PDF into the public invoice bucket; return its public URL."""
    s = get_settings()
    if not storage_enabled():
        return None
    base = s.supabase_url.rstrip("/")
    url = f"{base}/storage/v1/object/{s.invoice_bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {s.supabase_service_role_key}",
        "apikey": s.supabase_service_role_key,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
        "cache-control": "3600",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, content=pdf, headers=headers)
        if resp.status_code not in (200, 201):
            return None
    return f"{base}/storage/v1/object/public/{s.invoice_bucket}/{path}"
