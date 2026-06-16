import json
import pymysql
from datetime import date, datetime
from app.utils.db import get_db_connection

def get_all_encodings():
    """Fetches all registered face encodings to compare against the live camera."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # We join with the users table to get the name for the voice feedback
            sql = """
                SELECT f.user_id, f.encoding_vector, u.full_name 
                FROM face_encodings f
                JOIN users u ON f.user_id = u.id
            """
            cursor.execute(sql)
            results = cursor.fetchall()
            
            # Parse the JSON strings back into Python lists
            for row in results:
                row['encoding_vector'] = json.loads(row['encoding_vector'])
            return results
    finally:
        connection.close()

def log_attendance(user_id: int):
    """
    Attempts to log attendance for today.
    Returns (success_boolean, status_string).
    """
    connection = get_db_connection()
    today = date.today()
    now = datetime.now().time()
    
    try:
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO attendance_logs (user_id, log_date, log_time, status) 
                VALUES (%s, %s, %s, 'Present')
            """
            cursor.execute(sql, (user_id, today, now))
        connection.commit()
        return True, "Attendance marked successfully."
    except pymysql.err.IntegrityError:
        # Our DB constraint prevents two logs for the same user on the same date
        return False, "Duplicate scan. Already marked present today."
    finally:
        connection.close()