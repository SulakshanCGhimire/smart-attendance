import face_recognition
import numpy as np
import cv2
from app.models.face import save_face_encoding

def process_and_store_face(user_id: int, image_file):
    """
    Reads an image file, extracts the face encoding, and saves it.
    Returns (success_boolean, message).
    """
    try:
        # 1. Convert the incoming file stream to an OpenCV-readable numpy array
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if image is None:
            return False, "Invalid image format."

        # 2. Convert from BGR (OpenCV default) to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # 3. Detect face locations
        face_locations = face_recognition.face_locations(rgb_image)
        
        if not face_locations:
            return False, "No face detected in the image."
        if len(face_locations) > 1:
            return False, "Multiple faces detected. Please ensure only one person is in the frame."

        # 4. Generate the 128-D encoding
        encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        if not encodings:
            return False, "Could not extract facial features."

        # 5. Convert numpy array to standard Python list and save
        encoding_list = encodings[0].tolist()
        success = save_face_encoding(user_id, encoding_list)

        if success:
            return True, "Face registered and encoded successfully."
        else:
            return False, "Database error while saving the encoding."

    except Exception as e:
        return False, f"Image processing error: {str(e)}"