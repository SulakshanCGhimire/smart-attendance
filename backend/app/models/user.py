from app.utils.db import get_db_connection
import pymysql

def create_user(student_id: str, full_name: str, department: str, email: str, db_id: int = None):
    """Inserts a new student into the database and returns their ID."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            if db_id:
                sql = """
                    INSERT INTO users (id, student_id, full_name, department, email) 
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (db_id, student_id, full_name, department, email))
            else:
                sql = """
                    INSERT INTO users (student_id, full_name, department, email) 
                    VALUES (%s, %s, %s, %s)
                """
                cursor.execute(sql, (student_id, full_name, department, email))
            user_id = cursor.lastrowid if not db_id else db_id
        connection.commit()
        return user_id
    except pymysql.err.IntegrityError:
        # Handles duplicate student_id or email
        return None
    finally:
        connection.close()

def get_all_users():
    """Retrieves all users from the database."""
    connection = get_db_connection()
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = "SELECT id, student_id, full_name, department, email, created_at FROM users ORDER BY created_at DESC"
            cursor.execute(sql)
            users = cursor.fetchall()
            # Convert datetime to string for JSON serialization
            for user in users:
                if user.get('created_at'):
                    user['created_at'] = user['created_at'].strftime("%Y-%m-%d %H:%M:%S")
        return users
    except Exception as e:
        print(f"Error fetching users: {e}")
        return []
    finally:
        connection.close()

def update_user(user_id: int, student_id: str, full_name: str, department: str, email: str):
    """Updates an existing student in the database."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                UPDATE users 
                SET student_id = %s, full_name = %s, department = %s, email = %s
                WHERE id = %s
            """
            cursor.execute(sql, (student_id, full_name, department, email, user_id))
        connection.commit()
        return True
    except pymysql.err.IntegrityError:
        # Handles duplicate student_id or email
        return False
    except Exception as e:
        print(f"Error updating user: {e}")
        return False
    finally:
        connection.close()

def delete_user(user_id: int):
    """Deletes a user and their associated face encodings from the database."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM face_encodings WHERE user_id = %s", (user_id,))
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        connection.commit()
        return True
    except Exception as e:
        print(f"Error deleting user: {e}")
        return False
    finally:
        connection.close()
