from flask import Blueprint, request, jsonify
from app.services.face_service import process_and_store_face

faces_bp = Blueprint('faces', __name__, url_prefix='/api/faces')

@faces_bp.route('/register', methods=['POST'])
def register_face():
    # Check if the request contains an image file
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    # Check if the request contains the user_id
    user_id = request.form.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    image_file = request.files['image']
    
    # Send to service layer
    success, message = process_and_store_face(int(user_id), image_file)

    if success:
        return jsonify({"message": message}), 201
    else:
        return jsonify({"error": message}), 400