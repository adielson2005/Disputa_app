def register_blueprints(app):
    from routes.auth import auth_bp
    from routes.google_auth import google_auth_bp
    from routes.campeonato import campeonato_bp
    from routes.times import time_bp
    from routes.jogo import jogo_bp
    from routes.classificacao import classificacao_bp

    for bp in [auth_bp, google_auth_bp, campeonato_bp, time_bp, jogo_bp, classificacao_bp]:
        app.register_blueprint(bp, url_prefix="/api")
