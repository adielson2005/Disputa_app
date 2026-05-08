import jwt
import datetime


def gerar_token(user_id: int, secret: str, expiration_hours: int = 8) -> str:
    """Gera um JWT assinado para o usuário."""
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=expiration_hours),
    }
    return jwt.encode(payload, secret, algorithm="HS256")
