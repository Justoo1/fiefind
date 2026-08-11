from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    AUTH_SECRET: str
    INTERNAL_API_SECRET: str
    FASTAPI_PORT: int = 8000
    SMILE_ID_PARTNER_ID: str | None = None
    SMILE_ID_API_KEY: str | None = None
    SMILE_ID_WEBHOOK_SECRET: str | None = None
    HUBTEL_CLIENT_ID: str | None = None
    HUBTEL_CLIENT_SECRET: str | None = None
    HUBTEL_ACCOUNT_NUMBER: str | None = None
    HUBTEL_CALLBACK_URL: str | None = None
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str | None = None
    R2_PUBLIC_BASE_URL: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
