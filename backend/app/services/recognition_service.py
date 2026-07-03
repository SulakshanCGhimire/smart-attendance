import face_recognition
import numpy as np
import cv2
from app.models.attendance import get_all_encodings, log_attendance
from app.utils.voice import trigger_voice

# Tolerance: Lower is stricter. 0.6 is the industry standard for HOG models.
MATCH_TOLERANCE = 0.5 

def process_live_frame(image_file):
    """
    Takes a live frame, finds faces, matches them, and logs attendance.
    """
    try:
        # 1. Decode image stream
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if frame is None:
            return False, "Invalid frame data."

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # 2. Detect faces in the live frame
        face_locations = face_recognition.face_locations(rgb_frame)
        if not face_locations:
            return False, "No face detected in frame."
            
        live_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        live_encoding = live_encodings[0] # Assume one face in the scanner area

        # 3. Fetch all known database encodings
        known_data = get_all_encodings()
        if not known_data:
            return False, "No registered users in the database."

        known_encodings = [np.array(user['encoding_vector']) for user in known_data]
        
        # 4. Calculate Euclidean distances to find the best match
        face_distances = face_recognition.face_distance(known_encodings, live_encoding)
        best_match_index = np.argmin(face_distances)

        # 5. Determine if the best match is within our strict tolerance
        if face_distances[best_match_index] <= MATCH_TOLERANCE:
            matched_user = known_data[best_match_index]
            
            # Attempt to log to DB
            success, message = log_attendance(matched_user['user_id'])
            first_name = matched_user['full_name'].split()[0]

            # Trigger Voice Feedback
            if success:
                trigger_voice("Attendance marked successfully.")
            else:
                trigger_voice("Already marked today.")

            return True, {
                "user": matched_user['full_name'],
                "status": message,
                "is_duplicate": not success
            }
        else:
            trigger_voice("Unknown face detected. Access denied.")
            return False, "Unknown face. No match found."

    except Exception as e:
        print(f"Recognition Error: {e}")
        return False, "Internal processing error."