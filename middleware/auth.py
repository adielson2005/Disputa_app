from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request


def require_auth(f):
    """Decorator que exige JWT válido (flask-jwt-extended). Injeta user_id como kwarg."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            kwargs["user_id"] = int(get_jwt_identity())
        except Exception:
            return jsonify({"erro": "Não autorizado"}), 401
        return f(*args, **kwargs)

    return wrapper


def get_user_id() -> int | None:
    """Extrai user_id do JWT atual. Retorna None se inválido."""
    try:
        verify_jwt_in_request()
        return int(get_jwt_identity())
    except Exception:
        return None
