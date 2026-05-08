# Importa todos os models para garantir o registro no SQLAlchemy
from models.user import User
from models.campeonato import Campeonato
from models.times import Time
from models.jogo import Jogo

__all__ = ["User", "Campeonato", "Time", "Jogo"]
