from extensions import db
from models.mixins import TimestampMixin, SoftDeleteMixin
from werkzeug.security import generate_password_hash, check_password_hash


class User(TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "users"

    id          = db.Column(db.Integer, primary_key=True)
    email       = db.Column(db.String(254), unique=True, nullable=False)
    # senha_hash é nullable para usuários que só usam OAuth (Google)
    senha_hash  = db.Column(db.String(256), nullable=True)
    # OAuth Google
    google_id   = db.Column(db.String(128), unique=True, nullable=True, index=True)
    nome        = db.Column(db.String(120), nullable=True)
    foto_url    = db.Column(db.String(512), nullable=True)
    auth_provider = db.Column(db.String(20), nullable=False, default="email")

    def set_senha(self, senha: str) -> None:
        self.senha_hash = generate_password_hash(senha, method="pbkdf2:sha256:600000")

    def check_senha(self, senha: str) -> bool:
        if not self.senha_hash:
            return False
        return check_password_hash(self.senha_hash, senha)
