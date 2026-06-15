import json
from app.utils.db import get_db_connection

def save_face_encoding(user_id: int, encoding_vector: list):
    """Saves the 128-D facial encoding to the database linked to a user."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "INSERT INTO face_encodings (user_id, encoding_vector) VALUES (%s, %s)"
            cursor.execute(sql, (user_id, json.dumps(encoding_vector)))
        connection.commit()
        return True
    except Exception as e:
        print(f"Database error saving encoding: {e}")
        return False
    finally:
        connection.close()