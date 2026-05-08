from flask import Blueprint, jsonify, request, current_app

from extensions import db
from models.user import User
from services.auth_service import gerar_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    email = (data.get("email") or "").strip()
    senha = data.get("senha") or ""

    if not email or not senha:
        return jsonify({"erro": "Email e senha são obrigatórios"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"erro": "Email já cadastrado"}), 409

    user = User(email=email)
    user.set_senha(senha)
    db.session.add(user)
    db.session.commit()

    token = gerar_token(
        user.id,
        current_app.config["JWT_SECRET"],
        current_app.config["JWT_EXPIRATION_HOURS"],
    )
    return jsonify({"token": token, "id": user.id, "email": user.email}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    user = User.query.filter_by(email=data.get("email", "")).first()
    if not user or not user.check_senha(data.get("senha", "")):
        return jsonify({"erro": "Credenciais inválidas"}), 401

    token = gerar_token(
        user.id,
        current_app.config["JWT_SECRET"],
        current_app.config["JWT_EXPIRATION_HOURS"],
    )
    return jsonify({"token": token, "id": user.id, "email": user.email})
