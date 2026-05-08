from flask import abort

from models.campeonato import Campeonato


def get_ou_403(campeonato_id: int, user_id: int) -> Campeonato:
    """Busca campeonato ativo por ID e verifica que pertence ao user_id.
    Aborta com 404 se não existir ou estiver deletado, 403 se for de outro usuário."""
    c = Campeonato.query.filter_by(id=campeonato_id, deletado=False).first_or_404()
    if c.user_id != user_id:
        abort(403)
    return c
