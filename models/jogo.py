from extensions import db
from models.mixins import TimestampMixin, SoftDeleteMixin


class Jogo(TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "jogos"
    __table_args__ = (
        # O mesmo par de times não pode se enfrentar duas vezes no mesmo campeonato
        db.UniqueConstraint("time_a_id", "time_b_id", "campeonato_id", name="uq_jogo_par_campeonato"),
        # Consulta mais comum: listar/filtrar jogos de um campeonato
        db.Index("idx_jogo_campeonato", "campeonato_id"),
        # Classificação + geração de confrontos filtram por campeonato e status
        db.Index("idx_jogo_campeonato_status", "campeonato_id", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    time_a_id = db.Column(db.Integer, db.ForeignKey("times.id"), nullable=False)
    time_b_id = db.Column(db.Integer, db.ForeignKey("times.id"), nullable=False)
    campeonato_id = db.Column(db.Integer, db.ForeignKey("campeonatos.id"), nullable=False)

    placar_a = db.Column(db.Integer, default=0)
    placar_b = db.Column(db.Integer, default=0)
    amarelos_a = db.Column(db.Integer, default=0)
    amarelos_b = db.Column(db.Integer, default=0)
    vermelhos_a = db.Column(db.Integer, default=0)
    vermelhos_b = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default="aguardando")
    duracao = db.Column(db.Integer, default=45)
    tempo_inicio = db.Column(db.Float, nullable=True)
    tempo_acumulado = db.Column(db.Integer, default=0)

    # Relacionamentos explícitos para evitar ambiguidade com duas FK para times
    time_a = db.relationship("Time", foreign_keys=[time_a_id])
    time_b = db.relationship("Time", foreign_keys=[time_b_id])
