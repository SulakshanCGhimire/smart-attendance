from flask import Blueprint, request, jsonify
from app.services.user_service import register_student

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    user_id, error = register_student(data)

    if error:
        return jsonify({"error": error}), 400

    return jsonify({
        "message": "Student registered successfully",
        "user_id": user_id
    }), 201