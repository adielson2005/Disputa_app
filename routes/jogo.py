from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from middleware.auth import require_auth
from models.jogo import Jogo
from schemas.jogo_schema import CartaoSchema, GolSchema, JogoStatusSchema
from services import jogo_service
from services.campeonato_service import get_ou_403

_status_schema  = JogoStatusSchema()
_gol_schema     = GolSchema()
_cartao_schema  = CartaoSchema()

jogo_bp = Blueprint("jogo", __name__)


def _get_jogo_ou_403(jogo_id: int, user_id: int) -> Jogo:
    """Busca jogo ativo e verifica ownership via campeonato."""
    jogo = Jogo.query.filter_by(id=jogo_id, deletado=False).first_or_404()
    get_ou_403(jogo.campeonato_id, user_id)
    return jogo


@jogo_bp.route("/gerar-jogos/<int:campeonato_id>", methods=["POST"])
@require_auth
def gerar_jogos(campeonato_id, user_id):
    get_ou_403(campeonato_id, user_id)
    n = jogo_service.gerar_confrontos(campeonato_id)
    return jsonify({"mensagem": f"{n} jogos criados!"})


@jogo_bp.route("/jogos/<int:campeonato_id>", methods=["GET"])
@require_auth
def listar_jogos(campeonato_id, user_id):
    get_ou_403(campeonato_id, user_id)
    jogos = Jogo.query.filter_by(campeonato_id=campeonato_id, deletado=False).all()
    return jsonify([jogo_service.serializar(j) for j in jogos])


@jogo_bp.route("/jogos/<int:jogo_id>/status", methods=["POST"])
@require_auth
def mudar_status(jogo_id, user_id):
    jogo = _get_jogo_ou_403(jogo_id, user_id)
    raw = request.get_json(silent=True) or {}
    try:
        data = _status_schema.load(raw)
    except ValidationError as exc:
        return jsonify({"erro": "Dados inválidos", "detalhes": exc.messages}), 400
    jogo = jogo_service.mudar_status(jogo, data["acao"], data["duracao"])
    return jsonify(
        {
            "status": jogo.status,
            "tempo_acumulado": jogo.tempo_acumulado,
            "tempo_inicio": jogo.tempo_inicio,
        }
    )


@jogo_bp.route("/jogos/<int:jogo_id>/cartao", methods=["POST"])
@require_auth
def registrar_cartao(jogo_id, user_id):
    jogo = _get_jogo_ou_403(jogo_id, user_id)
    raw = request.get_json(silent=True) or {}
    try:
        data = _cartao_schema.load(raw)
    except ValidationError as exc:
        return jsonify({"erro": "Dados inválidos", "detalhes": exc.messages}), 400
    jogo = jogo_service.registrar_cartao(
        jogo,
        data["lado"],
        data["tipo"],
        data["delta"],
    )
    return jsonify({
        "amarelos_a": jogo.amarelos_a,
        "amarelos_b": jogo.amarelos_b,
        "vermelhos_a": jogo.vermelhos_a,
        "vermelhos_b": jogo.vermelhos_b,
    })


@jogo_bp.route("/jogos/<int:jogo_id>/gol", methods=["POST"])
@require_auth
def registrar_gol(jogo_id, user_id):
    jogo = _get_jogo_ou_403(jogo_id, user_id)
    raw = request.get_json(silent=True) or {}
    try:
        data = _gol_schema.load(raw)
    except ValidationError as exc:
        return jsonify({"erro": "Dados inválidos", "detalhes": exc.messages}), 400
    jogo = jogo_service.registrar_gol(jogo, data["lado"], data["delta"])
    return jsonify({"placar_a": jogo.placar_a, "placar_b": jogo.placar_b})
