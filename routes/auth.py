import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token

from extensions import db
from middleware.auth import require_auth
from models.campeonato import Campeonato
from models.user import User

auth_bp = Blueprint("auth", __name__)

# Regex básica de email (complementa email-validator se disponível)
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")

# Comprimento mínimo e máximo de senha
_SENHA_MIN = 8
_SENHA_MAX = 128


def _validar_email(email: str) -> bool:
    """Valida formato de email. Usa email-validator se disponível."""
    try:
        from email_validator import validate_email, EmailNotValidError
        validate_email(email, check_deliverability=False)
        return True
    except Exception:
        return bool(_EMAIL_RE.match(email))


def _validar_senha(senha: str) -> str | None:
    """Retorna mensagem de erro ou None se válida."""
    if len(senha) < _SENHA_MIN:
        return f"Senha deve ter no mínimo {_SENHA_MIN} caracteres"
    if len(senha) > _SENHA_MAX:
        return f"Senha muito longa"
    if not re.search(r"[A-Za-z]", senha):
        return "Senha deve conter pelo menos uma letra"
    if not re.search(r"[0-9]", senha):
        return "Senha deve conter pelo menos um número"
    return None


def _emit_token(user: User) -> dict:
    token = create_access_token(identity=str(user.id))
    return {
        "token":          token,
        "id":             user.id,
        "email":          user.email,
        "nome":           user.nome,
        "foto_url":       user.foto_url,
        "plano_ativo":    bool(user.plano_ativo),
        "plano_tipo":     user.plano_tipo,
        "plano_validade": user.plano_validade.isoformat() if user.plano_validade else None,
    }


@auth_bp.route("/register", methods=["POST"])
def register():
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    senha = data.get("senha") or ""

    if not email or not senha:
        return jsonify({"erro": "Email e senha são obrigatórios"}), 400
    if not _validar_email(email):
        return jsonify({"erro": "Email inválido"}), 400

    erro_senha = _validar_senha(senha)
    if erro_senha:
        return jsonify({"erro": erro_senha}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"erro": "Email já cadastrado"}), 409

    user = User(email=email, auth_provider="email")
    user.set_senha(senha)
    db.session.add(user)
    db.session.commit()

    return jsonify(_emit_token(user)), 201


@auth_bp.route("/user", methods=["DELETE"])
@require_auth
def delete_account(user_id):
    user = User.query.get(user_id)
    if not user or user.deletado:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    # Soft-delete de todos os campeonatos do usuário
    Campeonato.query.filter_by(user_id=user_id, deletado=False).update({"deletado": True})
    user.deletado = True
    db.session.commit()
    return jsonify({"mensagem": "Conta excluída com sucesso"}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    senha = data.get("senha") or ""

    if not email or not senha:
        return jsonify({"erro": "Email e senha são obrigatórios"}), 400

    user = User.query.filter_by(email=email).first()
    # Mensagem genérica — não revela se o email existe
    if not user or not user.check_senha(senha):
        return jsonify({"erro": "Credenciais inválidas"}), 401

    return jsonify(_emit_token(user))
