import os
import secrets

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _require_env(name: str) -> str:
    """Lê variável de ambiente obrigatória. Levanta erro claro se ausente."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"[DisputaApp] Variável de ambiente obrigatória não definida: {name}\n"
            f"  → Crie um arquivo .env baseado em .env.example e defina {name}."
        )
    return value


class BaseConfig:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "8"))


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DEV_DATABASE_URL", "sqlite:///disputaapp.db"
    ).replace("postgres://", "postgresql://", 1)
    JWT_SECRET = os.environ.get("JWT_SECRET") or secrets.token_hex(32)
    SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")


class ProductionConfig(BaseConfig):
    DEBUG = False

    @classmethod
    def validate(cls) -> None:
        """Chame create_app() — isso é executado automaticamente."""
        _require_env("JWT_SECRET")
        _require_env("SECRET_KEY")
        _require_env("DATABASE_URL")

    # Heroku / Railway expõe DATABASE_URL com prefixo "postgres://"
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL", "")
        .replace("postgres://", "postgresql://", 1)
    )
    JWT_SECRET = os.environ.get("JWT_SECRET")   # None → erro em validate()
    SECRET_KEY = os.environ.get("SECRET_KEY")   # None → erro em validate()
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG    = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET = "test-secret-not-for-production"
    SECRET_KEY = "test-secret-not-for-production"


_map = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "testing":     TestingConfig,
}


def get_config():
    env = os.environ.get("FLASK_ENV", "development")
    cfg = _map.get(env, DevelopmentConfig)
    if hasattr(cfg, "validate"):
        cfg.validate()
    return cfg
