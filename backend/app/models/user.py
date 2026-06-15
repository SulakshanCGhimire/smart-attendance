from app.utils.db import get_db_connection
import pymysql

def create_user(student_id: str, full_name: str, department: str, email: str):
    """Inserts a new student into the database and returns their ID."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO users (student_id, full_name, department, email) 
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(sql, (student_id, full_name, department, email))
            user_id = cursor.lastrowid
        connection.commit()
        return user_id
    except pymysql.err.IntegrityError:
        # Handles duplicate student_id or email
        return None
    finally:
        connection.close()