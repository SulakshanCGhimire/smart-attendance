import bcrypt
import jwt
import datetime
from app.config import Config

def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_password(password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_jwt(admin_id: int, username: str) -> str:
    """Generates a JSON Web Token valid for a set duration."""
    payload = {
        'admin_id': admin_id,
        'username': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    # Encode the token using our secret key
    token = jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')
    return token