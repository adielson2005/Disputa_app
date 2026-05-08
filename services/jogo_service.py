import time as time_module

from extensions import db
from models.jogo import Jogo
from models.times import Time


def gerar_confrontos(campeonato_id: int) -> int:
    """Gera todos os confrontos round-robin entre os times de um campeonato.
    Se campeonato.ida_volta for True, cada par de times joga duas vezes (casa e fora).
    A duração padrão de cada jogo é definida por campeonato.duracao_padrao."""
    from models.campeonato import Campeonato
    camp = Campeonato.query.get(campeonato_id)
    ida_volta      = bool(getattr(camp, "ida_volta", False))
    duracao_padrao = int(getattr(camp, "duracao_padrao", 45) or 45)

    times = Time.query.filter_by(campeonato_id=campeonato_id, deletado=False).all()
    criados = 0
    for i in range(len(times)):
        for j in range(i + 1, len(times)):
            db.session.add(Jogo(
                time_a_id=times[i].id,
                time_b_id=times[j].id,
                campeonato_id=campeonato_id,
                duracao=duracao_padrao,
            ))
            criados += 1
            if ida_volta:
                db.session.add(Jogo(
                    time_a_id=times[j].id,
                    time_b_id=times[i].id,
                    campeonato_id=campeonato_id,
                    duracao=duracao_padrao,
                ))
                criados += 1
    db.session.commit()
    return criados


def mudar_status(jogo: Jogo, acao: str, duracao: int | None) -> Jogo:
    """Avança o ciclo de status de uma partida."""
    agora = time_module.time()

    if duracao is not None:
        jogo.duracao = duracao

    if acao == "iniciar":
        jogo.status = "primeiro_tempo"
        jogo.tempo_inicio = agora
        jogo.tempo_acumulado = 0
    elif acao == "intervalo":
        if jogo.tempo_inicio:
            jogo.tempo_acumulado += int(agora - jogo.tempo_inicio)
        jogo.status = "intervalo"
        jogo.tempo_inicio = None
    elif acao == "segundo_tempo":
        jogo.status = "segundo_tempo"
        jogo.tempo_inicio = agora
    elif acao == "encerrar":
        if jogo.tempo_inicio:
            jogo.tempo_acumulado += int(agora - jogo.tempo_inicio)
        jogo.status = "encerrado"
        jogo.tempo_inicio = None

    db.session.commit()
    return jogo


def registrar_gol(jogo: Jogo, lado: str, delta: int) -> Jogo:
    """Adiciona ou remove um gol de um time."""
    if lado == "a":
        jogo.placar_a = max(0, jogo.placar_a + delta)
    elif lado == "b":
        jogo.placar_b = max(0, jogo.placar_b + delta)
    db.session.commit()
    return jogo


def registrar_cartao(jogo: Jogo, lado: str, tipo: str, delta: int) -> Jogo:
    """Adiciona ou remove um cartão de um time."""
    if lado == "a":
        if tipo == "amarelo":
            jogo.amarelos_a = max(0, jogo.amarelos_a + delta)
        elif tipo == "vermelho":
            jogo.vermelhos_a = max(0, jogo.vermelhos_a + delta)
    elif lado == "b":
        if tipo == "amarelo":
            jogo.amarelos_b = max(0, jogo.amarelos_b + delta)
        elif tipo == "vermelho":
            jogo.vermelhos_b = max(0, jogo.vermelhos_b + delta)
    db.session.commit()
    return jogo


def serializar(jogo: Jogo) -> dict:
    """Converte um Jogo em dicionário serializável para JSON."""
    return {
        "id": jogo.id,
        "time_a": jogo.time_a.nome,
        "time_b": jogo.time_b.nome,
        "placar_a": jogo.placar_a,
        "placar_b": jogo.placar_b,
        "amarelos_a": jogo.amarelos_a,
        "amarelos_b": jogo.amarelos_b,
        "vermelhos_a": jogo.vermelhos_a,
        "vermelhos_b": jogo.vermelhos_b,
        "status": jogo.status,
        "duracao": jogo.duracao,
        "tempo_inicio": jogo.tempo_inicio,
        "tempo_acumulado": jogo.tempo_acumulado,
    }
