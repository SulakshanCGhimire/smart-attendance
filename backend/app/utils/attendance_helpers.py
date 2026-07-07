from app.config import Config


def format_log_time_and_late_flag(time_obj):
    """
    Given a MySQL TIME value (returned by pymysql as a timedelta), returns:
      (formatted_12hr_string, is_late_boolean)

    Centralizes the "what counts as late" logic in one place, so the admin
    dashboard and the student attendance report can never disagree with
    each other about whether a given scan was late.
    """
    total_seconds = time_obj.seconds
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60

    period = 'AM' if hours < 12 else 'PM'
    display_hour = hours if hours <= 12 else hours - 12
    display_hour = 12 if display_hour == 0 else display_hour
    formatted = f"{display_hour:02d}:{minutes:02d} {period}"

    total_minutes = hours * 60 + minutes
    is_late = total_minutes >= Config.LATE_CUTOFF_MINUTES

    return formatted, is_late