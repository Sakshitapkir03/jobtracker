from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database (required)
    database_url: str

    # App
    environment: str = "development"

    # Scraper
    scrape_interval_hours: int = 24
    playwright_headless: bool = True

    # Optional — kept for backwards compat but not required
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    resend_api_key: str = ""
    email_from: str = ""
    secret_key: str = "dev-secret-key-change-in-production"
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"

    # Auth
    access_token_expire_minutes: int = 10080  # 7 days
    frontend_url: str = "http://localhost:3001"
    backend_url: str = "http://localhost:8000"
    # OAuth — set in dashboard, leave empty to disable
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
