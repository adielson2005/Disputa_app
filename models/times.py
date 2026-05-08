from extensions import db
from models.mixins import TimestampMixin, SoftDeleteMixin


class Time(TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "times"
    __table_args__ = (
        # Dois times não podem ter o mesmo nome no mesmo campeonato
        db.UniqueConstraint("nome", "campeonato_id", name="uq_time_nome_campeonato"),
    )

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)

    campeonato_id = db.Column(
        db.Integer,
        db.ForeignKey('campeonatos.id'),
        nullable=False,
        index=True,  # listar times de um campeonato
    )