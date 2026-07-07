from datetime import date
from app.models.user import get_user_by_student_id, get_user_by_id
from app.models.attendance import get_logs_for_user, get_log_for_user_on_date
from app.utils.security import check_password, generate_student_jwt
from app.utils.attendance_helpers import format_log_time_and_late_flag


def authenticate_student(student_id: str, password: str):
    """
    Validates a student's login credentials and returns a JWT if successful.
    Returns (token, error_message).
    """
    if not student_id or not password:
        return None, "Student ID and password are required."

    user = get_user_by_student_id(student_id)

    if not user:
        return None, "Invalid credentials."

    if not user.get('password_hash'):
        # Student was registered before password support existed, or an
        # admin hasn't set a password for them yet.
        return None, "No password set for this account yet. Please contact your admin."

    if not check_password(password, user['password_hash']):
        return None, "Invalid credentials."

    token = generate_student_jwt(user['id'], user['student_id'])
    return token, None


def get_student_profile(user_id: int):
    """Returns a student's public profile info (no password hash)."""
    return get_user_by_id(user_id)


def get_attendance_report(user_id: int, start_date=None, end_date=None):
    """
    Builds a full attendance report for one student: a per-day log list
    (formatted for display, with Present/Late/Absent status already
    resolved) plus summary counts.

    Since there's no class schedule/calendar in this system, "Absent" days
    aren't listed individually here (there's no way to know which days
    were expected) - the report shows exactly the days the student DID
    scan in, with Present/Late correctly distinguished, plus a percentage
    scoped to whatever date range was requested (e.g. one month, up to
    today if that month is still in progress).
    """
    user = get_user_by_id(user_id)
    if not user:
        return None, "User not found."

    logs = get_logs_for_user(user_id, start_date, end_date)

    formatted_logs = []
    late_count = 0

    for log in logs:
        formatted_time, is_late = format_log_time_and_late_flag(log['log_time'])
        formatted_logs.append({
            "date": log['log_date'].strftime('%Y-%m-%d'),
            "display_date": log['log_date'].strftime('%b %d, %Y'),
            "time": formatted_time,
            "status": "Late" if is_late else "Present"
        })
        if is_late:
            late_count += 1

    present_count = len(formatted_logs)
    on_time_count = present_count - late_count

    # Registration date - used as a floor, so the range never counts days
    # before the student even existed in the system.
    registration_date = user['created_at']
    if isinstance(registration_date, str):
        reg_date_only = date.fromisoformat(registration_date.split()[0])
    else:
        reg_date_only = registration_date.date() if hasattr(registration_date, 'date') else registration_date

    # Determine the actual range being reported on:
    # - if the caller gave start_date/end_date (e.g. "July 2026"), use that,
    #   clamped so it never starts before registration or ends after today.
    # - if no range was given, fall back to "since registration through today".
    range_start = date.fromisoformat(start_date) if start_date else reg_date_only
    range_start = max(range_start, reg_date_only)

    range_end = date.fromisoformat(end_date) if end_date else date.today()
    range_end = min(range_end, date.today())

    range_days = max((range_end - range_start).days + 1, 1)
    attendance_percentage = round((present_count / range_days) * 100, 1)

    report = {
        "student": {
            "full_name": user['full_name'],
            "student_id": user['student_id'],
            "department": user['department'],
        },
        "summary": {
            "total_present": present_count,
            "on_time": on_time_count,
            "late": late_count,
            "range_days": range_days,
            "attendance_percentage": attendance_percentage,
            "registered_on": reg_date_only.isoformat(),
        },
        "logs": formatted_logs,
    }

    return report, None


def check_attendance_on_date(user_id: int, target_date_str: str):
    """
    Checks whether a student was present (and if so, whether late) on one
    specific date. target_date_str should be 'YYYY-MM-DD'.
    Returns (result_dict, error_message).
    """
    try:
        target_date = date.fromisoformat(target_date_str)
    except (ValueError, TypeError):
        return None, "Invalid date format. Use YYYY-MM-DD."

    log = get_log_for_user_on_date(user_id, target_date)

    if not log:
        return {
            "date": target_date_str,
            "present": False,
            "status": "Absent",
            "time": None
        }, None

    formatted_time, is_late = format_log_time_and_late_flag(log['log_time'])

    return {
        "date": target_date_str,
        "present": True,
        "status": "Late" if is_late else "Present",
        "time": formatted_time
    }, None