from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.routes.auth import auth_bp
from app.routes.users import users_bp
from app.routes.faces import faces_bp
from app.routes.recognition import recognition_bp
from app.routes.admin import admin_bp 
from app.routes.student import student_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(faces_bp)
    app.register_blueprint(recognition_bp)
    app.register_blueprint(admin_bp) 
    app.register_blueprint(student_bp)

    return app