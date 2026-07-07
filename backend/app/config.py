import os
from dotenv import load_dotenv

# Securely load variables from the .env file
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    DB_HOST = os.environ.get('DB_HOST')
    DB_USER = os.environ.get('DB_USER')
    DB_PASSWORD = os.environ.get('DB_PASSWORD')
    DB_NAME = os.environ.get('DB_NAME')
    
    # JWT Config
    JWT_EXPIRATION_HOURS = 12

    # Attendance: minutes since midnight after which a scan counts as "Late".
    # 9*60 = 9:00 AM.
    LATE_CUTOFF_MINUTES = 9 * 60