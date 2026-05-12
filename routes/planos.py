from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from extensions import db
from middleware.auth import require_auth
from models.user import User

planos_bp = Blueprint("planos", __name__)


@planos_bp.route("/planos/assinar", methods=["POST"])
@require_auth
def assinar(user_id):
    data = request.get_json(silent=True) or {}
    tipo = data.get("tipo")
    if tipo not in ("mensal", "anual"):
        return jsonify({"erro": "Tipo de plano inválido. Use 'mensal' ou 'anual'."}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    user.plano_ativo    = True
    user.plano_tipo     = tipo
    user.plano_validade = datetime.utcnow() + timedelta(days=365 if tipo == "anual" else 30)
    db.session.commit()

    return jsonify({
        "plano_ativo":    True,
        "plano_tipo":     user.plano_tipo,
        "plano_validade": user.plano_validade.isoformat(),
    })


@planos_bp.route("/planos/cancelar", methods=["POST"])
@require_auth
def cancelar(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    user.plano_ativo    = False
    user.plano_tipo     = None
    user.plano_validade = None
    db.session.commit()

    return jsonify({"plano_ativo": False, "plano_tipo": None, "plano_validade": None})
