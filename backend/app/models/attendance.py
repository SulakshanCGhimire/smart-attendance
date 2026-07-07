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

def get_logs_for_user(user_id: int, start_date=None, end_date=None):
    """
    Fetches all attendance logs for a single student, optionally filtered
    to a date range. Ordered most-recent-first.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, log_date, log_time, status FROM attendance_logs WHERE user_id = %s"
            params = [user_id]

            if start_date:
                sql += " AND log_date >= %s"
                params.append(start_date)
            if end_date:
                sql += " AND log_date <= %s"
                params.append(end_date)

            sql += " ORDER BY log_date DESC, log_time DESC"

            cursor.execute(sql, tuple(params))
            return cursor.fetchall()
    finally:
        connection.close()

def get_log_for_user_on_date(user_id: int, target_date):
    """Fetches a single day's attendance log for one student, or None if absent that day."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, log_date, log_time, status FROM attendance_logs WHERE user_id = %s AND log_date = %s"
            cursor.execute(sql, (user_id, target_date))
            return cursor.fetchone()
    finally:
        connection.close()