from flask import Flask, send_from_directory

from config.settings import get_config
from extensions import cors, db, migrate


def _apply_db_migrations(app):
    """Adiciona colunas novas a tabelas existentes (SQLite não suporta ADD COLUMN IF NOT EXISTS)."""
    with app.app_context():
        from sqlalchemy import text
        with db.engine.connect() as conn:
            existing = {row[1] for row in conn.execute(text("PRAGMA table_info(campeonatos)"))}
            new_cols = {
                "descricao":      "VARCHAR(255)",
                "duracao_padrao": "INTEGER NOT NULL DEFAULT 45",
                "pontos_vitoria": "INTEGER NOT NULL DEFAULT 3",
                "ida_volta":      "BOOLEAN NOT NULL DEFAULT 0",
                "formato":        "VARCHAR(50)",
                "categoria":      "VARCHAR(50)",
            }
            for col, typedef in new_cols.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE campeonatos ADD COLUMN {col} {typedef}"))
            conn.commit()


def create_app(config=None):
    app = Flask(__name__, static_folder="frontend", static_url_path="")
    app.config.from_object(config or get_config())

    # Inicializa extensões
    db.init_app(app)
    cors.init_app(app)
    if migrate is not None:
        migrate.init_app(app, db)

    # Registra todos os blueprints sob /api
    from routes import register_blueprints
    register_blueprints(app)

    # Serve o frontend
    @app.route("/")
    def home():
        return send_from_directory("frontend", "index.html")

    # Cria tabelas (desenvolvimento / primeiro uso)
    with app.app_context():
        import models  # noqa: F401 — garante que os models são registrados
        db.create_all()

    # Migra colunas novas sem destruir dados existentes
    _apply_db_migrations(app)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
