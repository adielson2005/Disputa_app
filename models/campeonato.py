from extensions import db
from models.mixins import TimestampMixin, SoftDeleteMixin


class Campeonato(TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "campeonatos"
    __table_args__ = (
        # Um usuário não pode ter dois campeonatos com o mesmo nome
        db.UniqueConstraint("nome", "user_id", name="uq_campeonato_nome_user"),
        # Consulta mais comum: listar campeonatos de um usuário
        db.Index("idx_campeonato_user", "user_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    modalidade = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # ── Configurações do campeonato ────────────────────────────────
    descricao      = db.Column(db.String(255), nullable=True)
    duracao_padrao = db.Column(db.Integer, default=45, nullable=False)
    pontos_vitoria = db.Column(db.Integer, default=3,  nullable=False)
    ida_volta      = db.Column(db.Boolean,  default=False, nullable=False)
    formato        = db.Column(db.String(50), nullable=True)   # Liga | Copa | Grupos
    categoria      = db.Column(db.String(50), nullable=True)   # Livre | Profissional | Sub-xx…

    times = db.relationship('Time', backref='campeonato', lazy=True)