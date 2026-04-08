from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database (required)
    database_url: str

    # Redis + Celery
    redis_url: str = "redis://localhost:6379/0"

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
    secret_key: str = "dev-secret-key"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
