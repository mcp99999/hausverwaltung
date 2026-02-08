import os
from datetime import timedelta
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.security import generate_password_hash
from models import db, User

def create_app():
    app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///hausverwaltung.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET', 'dev-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)
    db.init_app(app)

    from auth import auth_bp
    from routes.properties import properties_bp
    from routes.meters import meters_bp
    from routes.tariffs import tariffs_bp
    from routes.expenses import expenses_bp
    from routes.recurring_costs import recurring_costs_bp
    from routes.users import users_bp
    from routes.reports import reports_bp
    from routes.activity_log import activity_log_bp
    from routes.uploads import uploads_bp
    from routes.backup import backup_bp
    from routes.contacts import contacts_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(properties_bp)
    app.register_blueprint(meters_bp)
    app.register_blueprint(tariffs_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(recurring_costs_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(activity_log_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(backup_bp)
    app.register_blueprint(contacts_bp)

    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                password_hash=generate_password_hash('admin'),
                role='admin',
            )
            db.session.add(admin)
            db.session.commit()

        # Initialize upload directories
        from routes.uploads import init_upload_dirs
        init_upload_dirs()

    @app.route('/')
    @app.route('/<path:path>')
    def serve_frontend(path=''):
        static = app.static_folder
        if path and os.path.exists(os.path.join(static, path)):
            return send_from_directory(static, path)
        return send_from_directory(static, 'index.html')

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5001)
