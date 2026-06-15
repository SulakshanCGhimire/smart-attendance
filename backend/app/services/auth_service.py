from app.models.admin import get_admin_by_username
from app.utils.security import check_password, generate_jwt

def authenticate_admin(username, password):
    """
    Validates credentials and returns a JWT if successful.
    Returns (token, error_message).
    """
    if not username or not password:
        return None, "Username and password are required."

    admin = get_admin_by_username(username)
    
    if not admin:
        return None, "Invalid credentials."

    if not check_password(password, admin['password_hash']):
        return None, "Invalid credentials."

    token = generate_jwt(admin['id'], admin['username'])
    return token, None