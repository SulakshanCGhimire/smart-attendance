from flask import Blueprint, jsonify
from app.utils.db import get_db_connection
from datetime import date

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/daily-stats', methods=['GET'])
def get_daily_stats():
    connection = get_db_connection()
    today = date.today()
    
    try:
        with connection.cursor() as cursor:
            # 1. Get total number of registered students
            cursor.execute("SELECT COUNT(*) as total FROM users")
            total_users = cursor.fetchone()['total']
            
            # 2. Get today's attendance logs
            sql_logs = """
                SELECT a.id, u.full_name as name, a.log_date as date, a.log_time as time, a.status 
                FROM attendance_logs a
                JOIN users u ON a.user_id = u.id
                WHERE a.log_date = %s
                ORDER BY a.log_time DESC
            """
            cursor.execute(sql_logs, (today,))
            today_logs = cursor.fetchall()
            
            # 3. Calculate Real-Time Stats
            present_count = len(today_logs)
            absent_count = total_users - present_count
            
            # Calculate Lates (assuming arrival after 09:00:00 AM is late)
            late_count = 0
            for log in today_logs:
                # Format datetime objects for React
                log['date'] = log['date'].strftime('%b %d, %Y')
                
                # Parse timedelta to AM/PM string
                total_seconds = log['time'].seconds
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                period = 'AM' if hours < 12 else 'PM'
                display_hour = hours if hours <= 12 else hours - 12
                display_hour = 12 if display_hour == 0 else display_hour
                
                log['time'] = f"{display_hour:02d}:{minutes:02d} {period}"
                
                # Check for late arrivals dynamically
                if hours >= 9:
                    late_count += 1
                    log['status'] = 'Late'

            stats = {
                "total": total_users,
                "present": present_count,
                "absent": absent_count,
                "late": late_count
            }
            
            return jsonify({"stats": stats, "logs": today_logs}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()