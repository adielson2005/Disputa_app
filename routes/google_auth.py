"""Autenticação via Google Identity Services (OAuth 2.0 / OIDC).

Fluxo:
  1. Frontend usa o SDK do Google (accounts.google.com/gsi/client) para obter
     um id_token (credential) via popup — sem redirecionamento de página.
  2. Frontend envia o id_token para POST /api/auth/google.
  3. Backend verifica a assinatura do token com as chaves públicas do Google,
     valida iss / aud / exp e extrai o perfil do usuário.
  4. Cria ou atualiza o usuário na base e devolve um JWT da aplicação.

Dependência: google-auth  (pip install google-auth)
"""

import os

from flask import Blueprint, jsonify, request, current_app

from extensions import db
from models.user import User
from services.auth_service import gerar_token
from routes.auth import _emit_token

google_auth_bp = Blueprint("google_auth", __name__)


def _get_client_id() -> str | None:
    return (
        current_app.config.get("GOOGLE_CLIENT_ID")
        or os.environ.get("GOOGLE_CLIENT_ID", "").strip()
        or None
    )


def _verify_google_token(credential: str, client_id: str) -> dict | None:
    """Verifica id_token do Google e retorna o payload, ou None se inválido."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as g_requests
        payload = id_token.verify_oauth2_token(
            credential,
            g_requests.Request(),
            client_id,
        )
        return payload
    except Exception as exc:
        current_app.logger.warning("Google token inválido: %s", exc)
        return None


@google_auth_bp.route("/auth/google", methods=["POST"])
def auth_google():
    client_id = _get_client_id()
    if not client_id:
        return jsonify({"erro": "Login com Google não configurado"}), 503

    data       = request.get_json(silent=True) or {}
    credential = (data.get("credential") or "").strip()
    if not credential:
        return jsonify({"erro": "Token Google ausente"}), 400

    payload = _verify_google_token(credential, client_id)
    if not payload:
        return jsonify({"erro": "Token Google inválido ou expirado"}), 401

    google_id = payload.get("sub")          # ID único do usuário no Google
    email     = (payload.get("email") or "").strip().lower()
    nome      = payload.get("name")
    foto_url  = payload.get("picture")

    if not email or not google_id:
        return jsonify({"erro": "Perfil Google incompleto"}), 400

    # 1. Busca por google_id (usuário já usou Google antes)
    user = User.query.filter_by(google_id=google_id).first()

    # 2. Busca por email (conta local existente — vincula automaticamente)
    if not user:
        user = User.query.filter_by(email=email).first()
        if user:
            user.google_id = google_id
            user.auth_provider = "google"

    # 3. Cria usuário novo
    if not user:
        user = User(
            email=email,
            google_id=google_id,
            auth_provider="google",
        )
        db.session.add(user)

    # Atualiza nome/foto sempre (podem mudar no perfil Google)
    user.nome     = nome     or user.nome
    user.foto_url = foto_url or user.foto_url
    db.session.commit()

    return jsonify(_emit_token(user))
