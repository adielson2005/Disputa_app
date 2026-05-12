from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from middleware.auth import require_auth
from models.campeonato import Campeonato
from models.jogo import Jogo
from services.campeonato_service import get_ou_403

campeonato_bp = Blueprint("campeonato", __name__)


@campeonato_bp.route("/campeonatos", methods=["POST"])
@require_auth
def criar_campeonato(user_id):
    data = request.json or {}
    if not data.get("nome") or not data.get("modalidade"):
        return jsonify({"erro": "Nome e modalidade são obrigatórios"}), 400

    c = Campeonato(
        nome           = data["nome"],
        modalidade     = data["modalidade"],
        user_id        = user_id,
        descricao      = data.get("descricao") or None,
        duracao_padrao = int(data.get("duracao_padrao") or 45),
        pontos_vitoria = int(data.get("pontos_vitoria") or 3),
        ida_volta      = bool(data.get("ida_volta", False)),
        formato        = data.get("formato")      or None,
        categoria      = data.get("categoria")     or None,
        sub_formato    = data.get("sub_formato")   or None,
        fase_inicial   = data.get("fase_inicial")  or None,
    )
    db.session.add(c)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"erro": "Você já possui um campeonato com esse nome"}), 409
    return jsonify(_serializar(c)), 201


@campeonato_bp.route("/campeonatos", methods=["GET"])
@require_auth
def listar_campeonatos(user_id):
    campeonatos = Campeonato.query.filter_by(user_id=user_id, deletado=False).all()
    result = []
    for c in campeonatos:
        total_times = len(c.times)
        jogos = Jogo.query.filter_by(campeonato_id=c.id, deletado=False).all()
        total_jogos     = len(jogos)
        jogos_encerrados = sum(1 for j in jogos if j.status == "encerrado")
        jogos_em_curso  = sum(1 for j in jogos if j.status in ("primeiro_tempo","segundo_tempo","intervalo"))
        if total_jogos == 0:
            status_camp = "nao_iniciado"
        elif jogos_encerrados == total_jogos:
            status_camp = "finalizado"
        else:
            status_camp = "em_andamento"
        d = _serializar(c)
        d.update({
            "total_times":      total_times,
            "total_jogos":      total_jogos,
            "jogos_encerrados": jogos_encerrados,
            "jogos_em_curso":   jogos_em_curso,
            "status":           status_camp,
        })
        result.append(d)
    return jsonify(result)


@campeonato_bp.route("/campeonatos/<int:campeonato_id>", methods=["GET"])
@require_auth
def buscar_campeonato(campeonato_id, user_id):
    c = get_ou_403(campeonato_id, user_id)
    return jsonify(_serializar(c))


@campeonato_bp.route("/campeonatos/<int:campeonato_id>", methods=["DELETE"])
@require_auth
def deletar_campeonato(campeonato_id, user_id):
    c = get_ou_403(campeonato_id, user_id)
    c.deletado = True
    db.session.commit()
    return jsonify({"ok": True})


@campeonato_bp.route("/campeonatos/<int:campeonato_id>/imagem", methods=["PATCH"])
@require_auth
def atualizar_imagem_campeonato(campeonato_id, user_id):
    """Atualiza logo ou capa do campeonato (base64 ou URL)."""
    c    = get_ou_403(campeonato_id, user_id)
    data = request.json or {}
    tipo = data.get("tipo")   # "logo" | "capa"
    url  = data.get("url")    # string base64 ou URL externa

    if tipo not in ("logo", "capa"):
        return jsonify({"erro": "tipo deve ser 'logo' ou 'capa'"}), 400

    # Limite de 4 MB em base64 (~3 MB arquivo original)
    if url and url.startswith("data:") and len(url) > 4 * 1024 * 1024:
        return jsonify({"erro": "Imagem muito grande. Máximo 3 MB"}), 413

    if tipo == "logo":
        c.logo_url = url or None
    else:
        c.capa_url = url or None

    db.session.commit()
    return jsonify({"ok": True, "tipo": tipo})


def _serializar(c):
    return {
        "id":             c.id,
        "nome":           c.nome,
        "modalidade":     c.modalidade,
        "descricao":      c.descricao,
        "duracao_padrao": c.duracao_padrao or 45,
        "pontos_vitoria": c.pontos_vitoria or 3,
        "ida_volta":      bool(c.ida_volta),
        "formato":        c.formato,
        "categoria":      c.categoria,
        "sub_formato":    c.sub_formato,
        "fase_inicial":   c.fase_inicial,
        "logo_url":       c.logo_url,
        "capa_url":       c.capa_url,
    }
