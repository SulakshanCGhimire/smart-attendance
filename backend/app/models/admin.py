from app.utils.db import get_db_connection

def get_admin_by_username(username: str):
    """Fetches an admin record by username."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, username, password_hash FROM admins WHERE username = %s"
            cursor.execute(sql, (username,))
            return cursor.fetchone()
    finally:
        connection.close()

def create_initial_admin(username: str, password_hash: str):
    """Utility to seed the first admin (used for setup)."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # IGNORE prevents error if admin already exists
            sql = "INSERT IGNORE INTO admins (username, password_hash) VALUES (%s, %s)"
            cursor.execute(sql, (username, password_hash))
        connection.commit()
    finally:
        connection.close()