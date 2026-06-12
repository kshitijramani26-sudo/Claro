"""Settings — read from services/api/.env via pydantic-settings."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/claro"
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    auth_dev_bypass: bool = False
    beta_auth: bool = False
    beta_login_code: str = "123456"
    host: str = "0.0.0.0"
    port: int = 8000
    # Optional: enables hosting invoice PDFs for WhatsApp links (Supabase Storage).
    # Needs a PUBLIC bucket (default name 'invoices') and the service-role key.
    supabase_service_role_key: str = ""
    invoice_bucket: str = "invoices"


@lru_cache
def get_settings() -> Settings:
    return Settings()
