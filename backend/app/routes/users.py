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

from app.models.user import get_all_users, update_user, delete_user

@users_bp.route('/', methods=['GET'])
@token_required
def get_users():
    users = get_all_users()
    return jsonify(users), 200

@users_bp.route('/<int:user_id>', methods=['PUT'])
@token_required
def edit_user(user_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400
    
    student_id = data.get('student_id')
    full_name = data.get('full_name')
    department = data.get('department')
    email = data.get('email')

    if not all([student_id, full_name, department, email]):
        return jsonify({"error": "Missing required fields"}), 400

    success = update_user(user_id, student_id, full_name, department, email)
    if success:
        return jsonify({"message": "User updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update user. Duplicate ID or Email?"}), 400

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@token_required
def remove_user(user_id):
    success = delete_user(user_id)
    if success:
        return jsonify({"message": "User deleted successfully"}), 200
    else:
        return jsonify({"error": "Failed to delete user"}), 400