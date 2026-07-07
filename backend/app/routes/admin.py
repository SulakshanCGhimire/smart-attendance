from flask import Blueprint, jsonify, request, Response
from app.utils.db import get_db_connection
from app.utils.security import token_required
from app.utils.attendance_helpers import format_log_time_and_late_flag
from app.services.admin_report_service import get_monthly_summary, generate_daily_csv, generate_monthly_csv
from app.services.student_service import get_attendance_report
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


@admin_bp.route('/monthly-summary', methods=['GET'])
@token_required
def monthly_summary():
    """Class-wide attendance summary (one row per student) for a date range."""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    try:
        summary = get_monthly_summary(start_date, end_date)
        return jsonify(summary), 200
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/export/daily-csv', methods=['GET'])
@token_required
def export_daily_csv():
    """Downloads a CSV of a single day's attendance log (defaults to today)."""
    target_date = request.args.get('date')

    try:
        csv_data, resolved_date = generate_daily_csv(target_date)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{resolved_date}.csv"}
    )


@admin_bp.route('/export/monthly-csv', methods=['GET'])
@token_required
def export_monthly_csv():
    """Downloads a CSV of the class-wide monthly summary for a date range."""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    try:
        csv_data, resolved_range = generate_monthly_csv(start_date, end_date)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    filename = f"monthly_report_{resolved_range['start_date']}_to_{resolved_range['end_date']}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@admin_bp.route('/student/<int:user_id>/attendance', methods=['GET'])
@token_required
def student_attendance_detail(user_id):
    """
    Full attendance detail for one specific student, for the admin to
    inspect - reuses the exact same report logic the student's own
    dashboard uses, so the numbers can never disagree between the two.
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    report, error = get_attendance_report(user_id, start_date, end_date)

    if error:
        return jsonify({"error": error}), 404

    return jsonify(report), 200