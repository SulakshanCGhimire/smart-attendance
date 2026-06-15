from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.routes.auth import auth_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for the frontend port (typically 5173 for Vite/React)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register Blueprints
    app.register_blueprint(auth_bp)

    return app