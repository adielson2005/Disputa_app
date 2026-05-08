from flask import Blueprint, jsonify

from middleware.auth import require_auth
from services import classificacao_service
from services.campeonato_service import get_ou_403

classificacao_bp = Blueprint("classificacao", __name__)


@classificacao_bp.route("/classificacao/<int:campeonato_id>", methods=["GET"])
@require_auth
def classificacao(campeonato_id, user_id):
    get_ou_403(campeonato_id, user_id)
    resultado = classificacao_service.calcular(campeonato_id)
    return jsonify(resultado)
