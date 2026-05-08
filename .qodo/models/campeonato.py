from database import db

class Campeonato(db.Model):
    __tablename__ = "campeonatos"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    modalidade = db.Column(db.String(50), nullable=False)