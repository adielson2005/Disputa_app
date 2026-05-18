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
        "auth_provider":  user.auth_provider,
        "created_at":     user.created_at.isoformat() if user.created_at else None,
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


@auth_bp.route("/user/senha", methods=["POST"])
@require_auth
def change_password(user_id):
    data = request.get_json(silent=True) or {}
    user = User.query.get(user_id)
    if not user or user.deletado:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    if user.auth_provider != "email":
        return jsonify({"erro": "Contas OAuth não permitem alteração de senha aqui"}), 400

    senha_atual = data.get("senha_atual", "")
    senha_nova  = data.get("senha_nova",  "")

    if not senha_atual or not senha_nova:
        return jsonify({"erro": "Todos os campos são obrigatórios"}), 400
    if not user.check_senha(senha_atual):
        return jsonify({"erro": "Senha atual incorreta"}), 400

    erro = _validar_senha(senha_nova)
    if erro:
        return jsonify({"erro": erro}), 400

    user.set_senha(senha_nova)
    db.session.commit()
    return jsonify({"mensagem": "Senha alterada com sucesso"})


@auth_bp.route("/user", methods=["PATCH"])
@require_auth
def update_user(user_id):
    data = request.get_json(silent=True) or {}
    user = User.query.get(user_id)
    if not user or user.deletado:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    nome = data.get("nome")
    if nome is not None:
        nome = nome.strip()
        if len(nome) > 120:
            return jsonify({"erro": "Nome muito longo (máx. 120 caracteres)"}), 400
        user.nome = nome or None

    if "foto_url" in data:
        foto = data["foto_url"]
        if foto is None or foto == "":
            user.foto_url = None
        else:
            foto = str(foto).strip()
            if foto.startswith("data:image/"):
                if len(foto) > 4 * 1024 * 1024:
                    return jsonify({"erro": "Imagem muito grande. Máximo 3 MB"}), 413
            elif foto.startswith(("http://", "https://")):
                if len(foto) > 512:
                    return jsonify({"erro": "URL da foto muito longa"}), 400
            else:
                return jsonify({"erro": "Foto inválida. Envie um arquivo de imagem ou uma URL"}), 400
            user.foto_url = foto

    db.session.commit()
    return jsonify({
        "mensagem": "Perfil atualizado",
        "nome":     user.nome,
        "email":    user.email,
        "foto_url": user.foto_url,
    })
