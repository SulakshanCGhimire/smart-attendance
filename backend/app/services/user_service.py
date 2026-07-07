from app.models.user import create_user
from app.utils.security import hash_password

def register_student(data: dict):
    """
    Validates payload and registers a student.
    If no 'password' is given, defaults the student's login password to their
    student_id (they should be told to change it - there's no self-service
    change-password flow yet, this is a starting point for logins to work).
    Returns (user_id, error_message).
    """
    required_fields = ['student_id', 'full_name', 'department', 'email']
    
    if not all(field in data and data[field] for field in required_fields):
        return None, "All fields (student_id, full_name, department, email) are required."

    db_id = data.get('db_id')
    try:
        db_id = int(db_id) if db_id else None
    except ValueError:
        return None, "Database ID must be a valid number."

    raw_password = data.get('password') or data['student_id']
    password_hash = hash_password(raw_password)

    user_id = create_user(
        data['student_id'], 
        data['full_name'], 
        data['department'], 
        data['email'],
        db_id,
        password_hash
    )

    if not user_id:
        return None, "Student ID, Email, or Database ID already exists in the system."

    return user_id, None