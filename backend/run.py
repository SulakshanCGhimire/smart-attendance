from app import create_app
from app.models.admin import create_initial_admin
from app.utils.security import hash_password

app = create_app()

def setup_database():
    """Seeds a default admin account so we can log in."""
    default_user = "admin"
    default_pass = "admin123"
    create_initial_admin(default_user, hash_password(default_pass))
    print(f"Ensured default admin exists: {default_user} / {default_pass}")

if __name__ == '__main__':
    setup_database()
    # Run in debug mode for development
    app.run(debug=True, host='0.0.0.0', port=5000)