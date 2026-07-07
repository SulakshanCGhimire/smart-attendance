"""
Liveness detection via blink analysis.

Uses the Eye Aspect Ratio (EAR) technique (Soukupova & Cech, 2016):
EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)

Where p1..p6 are the 6 landmark points around an eye, in order:
outer corner -> top-outer -> top-inner -> inner corner -> bottom-inner -> bottom-outer.

face_recognition's 'large' landmark model returns exactly these 6 points per eye
(via the bundled 68-point dlib predictor), so no extra model file is needed.

EAR stays roughly constant while the eye is open, and drops sharply (near 0)
when the eye is closed. A real blink is a brief dip below a threshold,
followed by a return to the open-eye level - a single static photo can
never produce this pattern, which is what makes this a workable liveness check.
"""

import numpy as np
import face_recognition

# Below this EAR, the eye is considered "closed" for this frame.
# Slightly raised from the strict research default (0.21) so partial/quick
# blinks are still caught, without being so high it starts misreading
# normal open eyes as closed (a comfortable gap remains below typical
# open-eye EAR of ~0.28-0.33).
EAR_CLOSED_THRESHOLD = 0.23

# Minimum number of consecutive closed-eye frames to count as a real blink
# (filters out a single noisy/misdetected frame).
MIN_CLOSED_FRAMES = 1

# Minimum number of open frames required before the closed dip, to confirm
# eyes were genuinely open before closing. Lowered from 2 to 1 - still
# guards against a single misdetected frame looking like a blink, but no
# longer requires a longer open run right at the very start/end of the
# capture window, which was rejecting genuine blinks that happened early.
MIN_OPEN_FRAMES_AROUND_BLINK = 1


def _euclidean(p1, p2):
    return np.linalg.norm(np.array(p1) - np.array(p2))


def _eye_aspect_ratio(eye_points):
    """
    eye_points: list of 6 (x, y) tuples for one eye, in dlib's standard order.
    """
    if len(eye_points) != 6:
        return None

    vertical_1 = _euclidean(eye_points[1], eye_points[5])
    vertical_2 = _euclidean(eye_points[2], eye_points[4])
    horizontal = _euclidean(eye_points[0], eye_points[3])

    if horizontal == 0:
        return None

    return (vertical_1 + vertical_2) / (2.0 * horizontal)


def compute_frame_ear(rgb_frame, face_location):
    """
    Given a single RGB frame and a face bounding box, returns the average
    EAR across both eyes, or None if landmarks couldn't be extracted.
    """
    landmarks_list = face_recognition.face_landmarks(rgb_frame, [face_location], model="large")
    if not landmarks_list:
        return None

    landmarks = landmarks_list[0]
    left_eye = landmarks.get('left_eye')
    right_eye = landmarks.get('right_eye')

    if not left_eye or not right_eye:
        return None

    left_ear = _eye_aspect_ratio(left_eye)
    right_ear = _eye_aspect_ratio(right_eye)

    if left_ear is None or right_ear is None:
        return None

    return (left_ear + right_ear) / 2.0


def detect_blink(ear_sequence):
    """
    Given a list of EAR values (one per frame, in chronological order),
    returns True if a genuine open -> closed -> open blink pattern is found.

    Frames where EAR could not be computed (None) are ignored for the
    pattern search but don't reset it, since a momentary tracking dropout
    isn't the same as the eyes actually closing.
    """
    valid_ear = [ear for ear in ear_sequence if ear is not None]

    if len(valid_ear) < (MIN_OPEN_FRAMES_AROUND_BLINK * 2 + MIN_CLOSED_FRAMES):
        return False

    state = "open"
    open_run = 0
    closed_run = 0
    confirmed_open_before = False

    for ear in valid_ear:
        is_closed = ear < EAR_CLOSED_THRESHOLD

        if state == "open":
            if is_closed:
                if open_run >= MIN_OPEN_FRAMES_AROUND_BLINK:
                    confirmed_open_before = True
                state = "closed"
                closed_run = 1
            else:
                open_run += 1
        elif state == "closed":
            if is_closed:
                closed_run += 1
            else:
                if confirmed_open_before and closed_run >= MIN_CLOSED_FRAMES:
                    # Eyes were open, then closed, now open again - blink confirmed
                    return True
                state = "open"
                open_run = 1

    return False


def check_liveness(rgb_frames):
    """
    rgb_frames: list of RGB numpy arrays (decoded frames from a short burst).

    Returns (is_live, face_location_of_best_frame, best_frame_index, debug_info)

    - is_live: True if a blink pattern was detected across the burst.
    - face_location_of_best_frame / best_frame_index: the frame with the
      highest EAR (eyes most open) is the best candidate for the actual
      recognition step afterward - sharper, more frontal, less motion blur
      from mid-blink.
    """
    ear_sequence = []
    face_locations_per_frame = []

    for rgb_frame in rgb_frames:
        locations = face_recognition.face_locations(rgb_frame)
        if not locations:
            ear_sequence.append(None)
            face_locations_per_frame.append(None)
            continue

        face_location = locations[0]
        face_locations_per_frame.append(face_location)
        ear_sequence.append(compute_frame_ear(rgb_frame, face_location))

    is_live = detect_blink(ear_sequence)

    # Pick the frame with the highest valid EAR as the best recognition candidate
    best_index = None
    best_ear = -1
    for i, ear in enumerate(ear_sequence):
        if ear is not None and ear > best_ear and face_locations_per_frame[i] is not None:
            best_ear = ear
            best_index = i

    debug_info = {
        "ear_sequence": ear_sequence,
        "frames_with_face": sum(1 for loc in face_locations_per_frame if loc is not None),
        "total_frames": len(rgb_frames),
    }

    if best_index is None:
        return False, None, None, debug_info

    return is_live, face_locations_per_frame[best_index], best_index, debug_info