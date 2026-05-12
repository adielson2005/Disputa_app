from flask import Flask, send_from_directory, Response

from config.settings import get_config
from extensions import cors, db, migrate


def _apply_db_migrations(app):
    """Adiciona colunas novas a tabelas existentes (SQLite não suporta ADD COLUMN IF NOT EXISTS)."""
    with app.app_context():
        from sqlalchemy import text

        # ── campeonatos ──────────────────────────────────────────────
        with db.engine.connect() as conn:
            existing = {row[1] for row in conn.execute(text("PRAGMA table_info(campeonatos)"))}
            new_cols = {
                "descricao":      "VARCHAR(255)",
                "duracao_padrao": "INTEGER NOT NULL DEFAULT 45",
                "pontos_vitoria": "INTEGER NOT NULL DEFAULT 3",
                "ida_volta":      "BOOLEAN NOT NULL DEFAULT 0",
                "formato":        "VARCHAR(50)",
                "categoria":      "VARCHAR(50)",
                "sub_formato":    "VARCHAR(50)",
                "fase_inicial":   "VARCHAR(50)",
            }
            for col, typedef in new_cols.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE campeonatos ADD COLUMN {col} {typedef}"))
            conn.commit()

        # ── users (google OAuth) ─────────────────────────────────────
        with db.engine.connect() as conn:
            existing_users = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
            user_cols = {
                "google_id":      "VARCHAR(128)",
                "nome":           "VARCHAR(120)",
                "foto_url":       "VARCHAR(512)",
                "auth_provider":  "VARCHAR(20) NOT NULL DEFAULT 'email'",
                "plano_ativo":    "BOOLEAN NOT NULL DEFAULT 0",
                "plano_tipo":     "VARCHAR(20)",
                "plano_validade": "DATETIME",
            }
            for col, typedef in user_cols.items():
                if col not in existing_users:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typedef}"))
            conn.commit()


def create_app(config=None):
    app = Flask(__name__, static_folder="frontend", static_url_path="")
    cfg = config or get_config()
    app.config.from_object(cfg)

    # Inicializa extensões
    db.init_app(app)
    cors.init_app(app)
    if migrate is not None:
        migrate.init_app(app, db)

    # Registra todos os blueprints sob /api
    from routes import register_blueprints
    register_blueprints(app)

    # Serve o frontend injetando o GOOGLE_CLIENT_ID na meta tag
    @app.route("/")
    def home():
        import os, re
        html_path = os.path.join(app.static_folder, "index.html")
        with open(html_path, encoding="utf-8") as f:
            html = f.read()
        client_id = app.config.get("GOOGLE_CLIENT_ID", "")
        # Substitui o content="" da meta google-client-id pelo valor real
        html = re.sub(
            r'(<meta\s+name="google-client-id"\s+content=")[^"]*(")',
            rf'\g<1>{client_id}\g<2>',
            html,
        )
        return Response(html, mimetype="text/html")

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
