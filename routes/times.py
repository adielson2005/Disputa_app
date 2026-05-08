from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from middleware.auth import require_auth
from models.times import Time
from services.campeonato_service import get_ou_403

time_bp = Blueprint("time", __name__)


@time_bp.route("/times", methods=["POST"])
@require_auth
def criar_time(user_id):
    data = request.json or {}
    campeonato_id = data.get("campeonato_id")
    if not data.get("nome") or not campeonato_id:
        return jsonify({"erro": "Nome e campeonato_id são obrigatórios"}), 400

    # Garante que o campeonato pertence ao usuário autenticado
    get_ou_403(campeonato_id, user_id)

    t = Time(nome=data["nome"], campeonato_id=campeonato_id)
    db.session.add(t)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"erro": "Já existe um time com esse nome neste campeonato"}), 409
    return jsonify({"id": t.id, "nome": t.nome, "campeonato_id": t.campeonato_id}), 201


@time_bp.route("/times/<int:campeonato_id>", methods=["GET"])
@require_auth
def listar_times(campeonato_id, user_id):
    # Verifica que o campeonato pertence ao usuário antes de retornar os times
    get_ou_403(campeonato_id, user_id)
    times = Time.query.filter_by(campeonato_id=campeonato_id, deletado=False).all()
    return jsonify([{"id": t.id, "nome": t.nome} for t in times])
