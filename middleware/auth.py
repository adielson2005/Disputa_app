from functools import wraps

import jwt
from flask import current_app, jsonify, request


def require_auth(f):
    """Decorator que exige JWT válido. Injeta ``user_id`` como kwarg na função."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        user_id = _get_user_id()
        if not user_id:
            return jsonify({"erro": "Não autorizado"}), 401
        kwargs["user_id"] = user_id
        return f(*args, **kwargs)

    return wrapper


def get_user_id() -> int | None:
    """Extrai e valida o user_id do token JWT. Retorna None se inválido."""
    return _get_user_id()


def _get_user_id() -> int | None:
    header = request.headers.get("Authorization", "")
    token = header.removeprefix("Bearer ").strip()
    if not token:
        return None
    try:
        dados = jwt.decode(
            token, current_app.config["JWT_SECRET"], algorithms=["HS256"]
        )
        return dados.get("user_id")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
