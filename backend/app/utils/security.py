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
    """Generates a JSON Web Token for an ADMIN, valid for a set duration."""
    payload = {
        'admin_id': admin_id,
        'username': username,
        'role': 'admin',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')
    return token

def generate_student_jwt(user_id: int, student_id: str) -> str:
    """Generates a JSON Web Token for a STUDENT, valid for a set duration."""
    payload = {
        'user_id': user_id,
        'student_id': student_id,
        'role': 'student',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')
    return token

def _decode_bearer_token(auth_header):
    """
    Shared helper: extracts and decodes a Bearer token from an Authorization
    header. Returns (payload, error_response_tuple). Exactly one will be None.
    """
    if not auth_header:
        return None, (jsonify({"error": "Authorization token is missing."}), 401)

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None, (jsonify({"error": "Invalid Authorization header format. Expected 'Bearer <token>'."}), 401)

    token = parts[1]

    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"error": "Token has expired. Please log in again."}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"error": "Invalid token."}), 401)

def token_required(f):
    """
    Decorator that protects an ADMIN route. Requires a valid JWT with
    role='admin' in the Authorization header ('Authorization: Bearer <token>').
    A valid student token will NOT pass this check.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        payload, error = _decode_bearer_token(request.headers.get('Authorization'))
        if error:
            return error

        if payload.get('role') != 'admin':
            return jsonify({"error": "Admin access required."}), 403

        request.admin = payload
        return f(*args, **kwargs)
    return decorated

def student_token_required(f):
    """
    Decorator that protects a STUDENT route. Requires a valid JWT with
    role='student'. A valid admin token will NOT pass this check, and
    vice versa - keeps the two login systems from being interchangeable.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        payload, error = _decode_bearer_token(request.headers.get('Authorization'))
        if error:
            return error

        if payload.get('role') != 'student':
            return jsonify({"error": "Student access required."}), 403

        request.student = payload
        return f(*args, **kwargs)
    return decorated