from models.jogo import Jogo
from models.times import Time


def calcular(campeonato_id: int) -> list:
    """Calcula a tabela de classificação baseado nos jogos encerrados.
    Usa campeonato.pontos_vitoria para o valor de uma vitória (padrão 3)."""
    from models.campeonato import Campeonato
    camp = Campeonato.query.get(campeonato_id)
    pts_vit = int(getattr(camp, "pontos_vitoria", 3) or 3)

    times = Time.query.filter_by(campeonato_id=campeonato_id, deletado=False).all()
    jogos = Jogo.query.filter_by(
        campeonato_id=campeonato_id, status="encerrado", deletado=False
    ).all()

    tabela = {
        t.id: {
            "nome": t.nome,
            "pontos": 0,
            "vitorias": 0,
            "empates": 0,
            "derrotas": 0,
            "saldo": 0,
        }
        for t in times
    }

    for j in jogos:
        if j.time_a_id not in tabela or j.time_b_id not in tabela:
            continue
        a, b = tabela[j.time_a_id], tabela[j.time_b_id]
        a["saldo"] += j.placar_a - j.placar_b
        b["saldo"] += j.placar_b - j.placar_a
        if j.placar_a > j.placar_b:
            a["pontos"] += pts_vit
            a["vitorias"] += 1
            b["derrotas"] += 1
        elif j.placar_a < j.placar_b:
            b["pontos"] += pts_vit
            b["vitorias"] += 1
            a["derrotas"] += 1
        else:
            a["pontos"] += 1
            b["pontos"] += 1
            a["empates"] += 1
            b["empates"] += 1

    return sorted(
        tabela.values(), key=lambda x: (x["pontos"], x["saldo"]), reverse=True
    )
