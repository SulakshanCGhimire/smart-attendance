import face_recognition
import numpy as np
import cv2
from app.models.attendance import get_all_encodings, log_attendance
from app.utils.voice import trigger_voice
from app.utils.liveness import check_liveness

# Tolerance: Lower is stricter. 0.6 is the industry standard for HOG models.
MATCH_TOLERANCE = 0.5


def _decode_frame(image_file):
    """Decodes an uploaded image file into an RGB numpy array, or None if invalid."""
    file_bytes = np.frombuffer(image_file.read(), np.uint8)
    frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if frame is None:
        return None
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)


def process_live_frame(image_file):
    """
    Takes a SINGLE live frame, finds faces, matches them, and logs attendance.
    Kept for backward compatibility / testing - the live scanner now uses
    process_liveness_burst() instead, which adds blink-based liveness detection.
    """
    try:
        rgb_frame = _decode_frame(image_file)
        if rgb_frame is None:
            return False, "Invalid frame data."

        face_locations = face_recognition.face_locations(rgb_frame)
        if not face_locations:
            return False, "No face detected in frame."

        return _match_and_log(rgb_frame, face_locations[0])

    except Exception as e:
        print(f"Recognition Error: {e}")
        return False, "Internal processing error."


def process_liveness_burst(image_files):
    """
    Takes a short burst of frames (captured a few hundred ms apart), runs
    blink-based liveness detection across them, and if a genuine blink is
    found, runs face recognition on the sharpest (eyes-most-open) frame
    from that burst.

    This defends against a printed photo or a phone screen being held up
    to the camera, since a static image can never produce an EAR sequence
    with a genuine open -> closed -> open dip.
    """
    try:
        rgb_frames = []
        for image_file in image_files:
            rgb_frame = _decode_frame(image_file)
            if rgb_frame is not None:
                rgb_frames.append(rgb_frame)

        if len(rgb_frames) < 5:
            return False, "Not enough valid frames captured. Please try again."

        is_live, face_location, best_index, debug_info = check_liveness(rgb_frames)

        if debug_info["frames_with_face"] == 0:
            return False, "No face detected during scan."

        if not is_live:
            return False, "Liveness check failed - please blink naturally while scanning."

        best_frame = rgb_frames[best_index]
        return _match_and_log(best_frame, face_location)

    except Exception as e:
        print(f"Liveness/Recognition Error: {e}")
        return False, "Internal processing error."


def _match_and_log(rgb_frame, face_location):
    """
    Shared matching + attendance-logging logic, given a single RGB frame
    and the bounding box of the face to match against known encodings.
    """
    live_encodings = face_recognition.face_encodings(rgb_frame, [face_location])
    if not live_encodings:
        return False, "Could not generate a face encoding from the captured frame."

    live_encoding = live_encodings[0]

    known_data = get_all_encodings()
    if not known_data:
        return False, "No registered users in the database."

    known_encodings = [np.array(user['encoding_vector']) for user in known_data]

    face_distances = face_recognition.face_distance(known_encodings, live_encoding)
    best_match_index = np.argmin(face_distances)

    if face_distances[best_match_index] <= MATCH_TOLERANCE:
        matched_user = known_data[best_match_index]

        success, message = log_attendance(matched_user['user_id'])

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