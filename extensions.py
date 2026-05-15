from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# ─────────────────────────────────────────────
# Banco de dados
# ─────────────────────────────────────────────
db = SQLAlchemy()

# ─────────────────────────────────────────────
# Migration
# ─────────────────────────────────────────────
migrate = Migrate()

# ─────────────────────────────────────────────
# JWT
# ─────────────────────────────────────────────
jwt = JWTManager()

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
cors = CORS(
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        }
    }
)