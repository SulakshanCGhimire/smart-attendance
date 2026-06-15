from app.models.user import create_user

def register_student(data: dict):
    """
    Validates payload and registers a student.
    Returns (user_id, error_message).
    """
    required_fields = ['student_id', 'full_name', 'department', 'email']
    
    if not all(field in data and data[field] for field in required_fields):
        return None, "All fields (student_id, full_name, department, email) are required."

    user_id = create_user(
        data['student_id'], 
        data['full_name'], 
        data['department'], 
        data['email']
    )

    if not user_id:
        return None, "Student ID or Email already exists in the system."

    return user_id, None