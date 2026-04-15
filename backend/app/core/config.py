from pathlib import Path
from typing import Any

from pydantic import BaseSettings, Field, PostgresDsn


class Settings(BaseSettings):
    PROJECT_NAME: str = "cooperative-iot-monitor"
    POSTGRES_USER: str = Field("iot_user", env="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field("iot_password", env="POSTGRES_PASSWORD")
    POSTGRES_SERVER: str = Field("localhost", env="POSTGRES_SERVER")
    POSTGRES_PORT: int = Field(5432, env="POSTGRES_PORT")
    POSTGRES_DB: str = Field("iot_monitor", env="POSTGRES_DB")
    SQLALCHEMY_DATABASE_URI: PostgresDsn | str = ""
    JWT_SECRET_KEY: str = Field("supersecretjwtkey", env="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    MQTT_BROKER_HOST: str = Field("localhost", env="MQTT_BROKER_HOST")
    MQTT_BROKER_PORT: int = Field(1883, env="MQTT_BROKER_PORT")
    MQTT_TOPIC: str = Field("esp32/sensors", env="MQTT_TOPIC")

    class Config:
        env_file = Path(__file__).resolve().parent.parent.parent / ".env"
        case_sensitive = True

    def __init__(self, **values: Any) -> None:
        super().__init__(**values)
        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = (
                f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )


settings = Settings()
