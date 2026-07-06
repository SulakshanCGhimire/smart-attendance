from flask import Blueprint, request, jsonify
from app.services.recognition_service import process_liveness_burst

recognition_bp = Blueprint('recognition', __name__, url_prefix='/api/attendance')

@recognition_bp.route('/recognize', methods=['POST'])
def recognize_face():
    frame_files = request.files.getlist('frames')

    if not frame_files:
        return jsonify({"error": "No video frames provided"}), 400

    success, result = process_liveness_burst(frame_files)

    if success:
        return jsonify(result), 200
    else:
        return jsonify({"error": result}), 401  # Unauthorized/Unknown/Liveness failed