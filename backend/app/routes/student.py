from flask import Blueprint, request, jsonify
from app.services.student_service import (
    authenticate_student,
    get_student_profile,
    get_attendance_report,
    check_attendance_on_date,
)
from app.utils.security import student_token_required

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


@student_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    student_id = data.get('student_id')
    password = data.get('password')

    token, error = authenticate_student(student_id, password)

    if error:
        return jsonify({"error": error}), 401

    return jsonify({
        "message": "Login successful",
        "token": token
    }), 200


@student_bp.route('/me', methods=['GET'])
@student_token_required
def me():
    user_id = request.student['user_id']
    profile = get_student_profile(user_id)

    if not profile:
        return jsonify({"error": "Profile not found."}), 404

    return jsonify(profile), 200


@student_bp.route('/attendance', methods=['GET'])
@student_token_required
def attendance():
    user_id = request.student['user_id']

    start_date = request.args.get('start_date')  # optional, YYYY-MM-DD
    end_date = request.args.get('end_date')       # optional, YYYY-MM-DD

    report, error = get_attendance_report(user_id, start_date, end_date)

    if error:
        return jsonify({"error": error}), 404

    return jsonify(report), 200


@student_bp.route('/attendance/check', methods=['GET'])
@student_token_required
def attendance_check():
    user_id = request.student['user_id']
    target_date = request.args.get('date')

    if not target_date:
        return jsonify({"error": "Query parameter 'date' (YYYY-MM-DD) is required."}), 400

    result, error = check_attendance_on_date(user_id, target_date)

    if error:
        return jsonify({"error": error}), 400

    return jsonify(result), 200