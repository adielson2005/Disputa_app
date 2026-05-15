from flask import Flask, Response

from config.settings import get_config
from extensions import (
    cors,
    db,
    migrate,
    jwt
)


def _apply_db_migrations(app):
    """
    Adiciona colunas novas a tabelas existentes.
    Compatível com SQLite.
    """
    with app.app_context():
        from sqlalchemy import text

        try:
            # ── campeonatos ──────────────────────────────────────────────
            with db.engine.connect() as conn:
                existing = {
                    row[1]
                    for row in conn.execute(
                        text("PRAGMA table_info(campeonatos)")
                    )
                }

                new_cols = {
                    "descricao": "VARCHAR(255)",
                    "duracao_padrao": "INTEGER NOT NULL DEFAULT 45",
                    "pontos_vitoria": "INTEGER NOT NULL DEFAULT 3",
                    "ida_volta": "BOOLEAN NOT NULL DEFAULT 0",
                    "formato": "VARCHAR(50)",
                    "categoria": "VARCHAR(50)",
                    "sub_formato": "VARCHAR(50)",
                    "fase_inicial": "VARCHAR(50)",
                }

                for col, typedef in new_cols.items():
                    if col not in existing:
                        conn.execute(
                            text(
                                f"ALTER TABLE campeonatos "
                                f"ADD COLUMN {col} {typedef}"
                            )
                        )

                conn.commit()

            # ── users (google OAuth) ─────────────────────────────────────
            with db.engine.connect() as conn:
                existing_users = {
                    row[1]
                    for row in conn.execute(
                        text("PRAGMA table_info(users)")
                    )
                }

                user_cols = {
                    "google_id": "VARCHAR(128)",
                    "nome": "VARCHAR(120)",
                    "foto_url": "VARCHAR(512)",
                    "auth_provider": "VARCHAR(20) NOT NULL DEFAULT 'email'",
                    "plano_ativo": "BOOLEAN NOT NULL DEFAULT 0",
                    "plano_tipo": "VARCHAR(20)",
                    "plano_validade": "DATETIME",
                }

                for col, typedef in user_cols.items():
                    if col not in existing_users:
                        conn.execute(
                            text(
                                f"ALTER TABLE users "
                                f"ADD COLUMN {col} {typedef}"
                            )
                        )

                conn.commit()

        except Exception as e:
            print(f"[ERRO MIGRATION]: {e}")


def create_app(config=None):
    app = Flask(
        __name__,
        static_folder="frontend",
        static_url_path=""
    )

    cfg = config or get_config()
    app.config.from_object(cfg)

    # Inicializa extensões
    db.init_app(app)

    jwt.init_app(app)

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ]
            }
        }
    )

    if migrate is not None:
        migrate.init_app(app, db)

    # Registra blueprints
    from routes import register_blueprints
    register_blueprints(app)

    # ── FRONTEND ──────────────────────────────────────────────────────
    @app.route("/")
    def home():
        import os
        import re

        html_path = os.path.join(
            app.static_folder,
            "index.html"
        )

        try:
            with open(html_path, encoding="utf-8") as f:
                html = f.read()

            client_id = app.config.get(
                "GOOGLE_CLIENT_ID",
                ""
            )

            html = re.sub(
                r'(<meta\s+name="google-client-id"\s+content=")[^"]*(")',
                rf'\g<1>{client_id}\g<2>',
                html,
            )

            return Response(
                html,
                mimetype="text/html"
            )

        except FileNotFoundError:
            return {
                "success": False,
                "message": "Arquivo index.html não encontrado"
            }, 404

        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }, 500

    # ── HANDLERS DE ERRO ──────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(error):
        return {
            "success": False,
            "message": "Rota não encontrada"
        }, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {
            "success": False,
            "message": "Erro interno do servidor"
        }, 500

    @app.errorhandler(Exception)
    def handle_exception(error):
        return {
            "success": False,
            "message": str(error)
        }, 500

    # ── CRIA TABELAS ──────────────────────────────────────────────────
    with app.app_context():
        import models  # noqa: F401

        db.create_all()

    # ── MIGRATIONS ────────────────────────────────────────────────────
    _apply_db_migrations(app)

    return app


app = create_app ()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        debug=app.config.get("DEBUG", False)
    )