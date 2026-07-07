from flask import Blueprint, jsonify
from app.utils.db import get_db_connection
from app.utils.security import token_required
from app.utils.attendance_helpers import format_log_time_and_late_flag
from datetime import date

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/daily-stats', methods=['GET'])
@token_required
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
            
            late_count = 0
            for log in today_logs:
                log['date'] = log['date'].strftime('%b %d, %Y')

                formatted_time, is_late = format_log_time_and_late_flag(log['time'])
                log['time'] = formatted_time

                if is_late:
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