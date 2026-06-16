from flask import Blueprint, request, jsonify
from app.services.recognition_service import process_live_frame

recognition_bp = Blueprint('recognition', __name__, url_prefix='/api/attendance')

@recognition_bp.route('/recognize', methods=['POST'])
def recognize_face():
    if 'frame' not in request.files:
        return jsonify({"error": "No video frame provided"}), 400

    frame_file = request.files['frame']
    
    success, result = process_live_frame(frame_file)

    if success:
        return jsonify(result), 200
    else:
        return jsonify({"error": result}), 401 # Unauthorized/Unknown