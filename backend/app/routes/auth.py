from flask import Blueprint, request, jsonify
from app.services.auth_service import authenticate_admin

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    username = data.get('username')
    password = data.get('password')

    token, error = authenticate_admin(username, password)

    if error:
        # We use 401 Unauthorized for login failures
        return jsonify({"error": error}), 401

    return jsonify({
        "message": "Login successful",
        "token": token
    }), 200