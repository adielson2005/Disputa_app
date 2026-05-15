import os
import datetime
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ─────────────────────────────────────────────
    # Segurança
    # ─────────────────────────────────────────────
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "dev_secret_key"
    )

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "dev_jwt_secret"
    )

    JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=8)

    # ─────────────────────────────────────────────
    # Banco de dados
    # ─────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///disputaapp.db"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ─────────────────────────────────────────────
    # Google OAuth
    # ─────────────────────────────────────────────
    GOOGLE_CLIENT_ID = os.getenv(
        "GOOGLE_CLIENT_ID",
        ""
    )

    # ─────────────────────────────────────────────
    # Ambiente
    # ─────────────────────────────────────────────
    DEBUG = os.getenv(
        "DEBUG",
        "False"
    ).lower() == "true"


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


def get_config():
    env = os.getenv(
        "FLASK_ENV",
        "development"
    )

    configs = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
    }

    return configs.get(
        env,
        DevelopmentConfig
    )