import bcrypt
import jwt
import datetime
from functools import wraps
from flask import request, jsonify
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

def token_required(f):
    """
    Decorator that protects a route by requiring a valid JWT
    in the Authorization header, e.g. 'Authorization: Bearer <token>'.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({"error": "Authorization token is missing."}), 401

        # Expecting header format: "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({"error": "Invalid Authorization header format. Expected 'Bearer <token>'."}), 401

        token = parts[1]

        try:
            jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token."}), 401

        return f(*args, **kwargs)
    return decorated