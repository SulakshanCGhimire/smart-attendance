from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.routes.auth import auth_bp
from app.routes.users import users_bp 

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp) 

    return app