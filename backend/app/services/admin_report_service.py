import csv
import io
from datetime import date
from app.models.user import get_all_users
from app.models.attendance import get_logs_for_user
from app.utils.attendance_helpers import format_log_time_and_late_flag


def _resolve_range(start_date_str, end_date_str):
    """
    Resolves a (start_date, end_date) pair of date objects from optional
    'YYYY-MM-DD' strings. Defaults to "since the start of the current month,
    through today" if nothing is given. end_date is always clamped to today
    (a report can't include days that haven't happened yet).
    """
    today = date.today()

    if start_date_str:
        start = date.fromisoformat(start_date_str)
    else:
        start = today.replace(day=1)

    if end_date_str:
        end = date.fromisoformat(end_date_str)
    else:
        end = today

    end = min(end, today)

    return start, end


def get_monthly_summary(start_date_str=None, end_date_str=None):
    """
    Builds a class-wide attendance summary for every registered student
    across the given date range: how many days present, how many late,
    how many absent, and an attendance percentage - one row per student,
    plus overall totals across the whole class.
    """
    start, end = _resolve_range(start_date_str, end_date_str)
    range_days = max((end - start).days + 1, 1)

    all_users = get_all_users()
    student_rows = []

    total_present_sum = 0
    total_late_sum = 0

    for user in all_users:
        logs = get_logs_for_user(user['id'], start.isoformat(), end.isoformat())

        present_count = len(logs)
        late_count = 0
        for log in logs:
            _, is_late = format_log_time_and_late_flag(log['log_time'])
            if is_late:
                late_count += 1

        on_time_count = present_count - late_count
        absent_count = max(range_days - present_count, 0)
        percentage = round((present_count / range_days) * 100, 1)

        student_rows.append({
            "user_id": user['id'],
            "student_id": user['student_id'],
            "full_name": user['full_name'],
            "department": user['department'],
            "present": present_count,
            "on_time": on_time_count,
            "late": late_count,
            "absent": absent_count,
            "attendance_percentage": percentage,
        })

        total_present_sum += present_count
        total_late_sum += late_count

    # Sort by attendance percentage ascending, so students needing the most
    # attention surface at the top of the table.
    student_rows.sort(key=lambda r: r['attendance_percentage'])

    class_average = round(
        sum(r['attendance_percentage'] for r in student_rows) / len(student_rows), 1
    ) if student_rows else 0

    return {
        "range": {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "range_days": range_days,
        },
        "totals": {
            "total_students": len(student_rows),
            "total_present_marks": total_present_sum,
            "total_late_marks": total_late_sum,
            "class_average_percentage": class_average,
        },
        "students": student_rows,
    }


def generate_daily_csv(target_date_str=None):
    """
    Generates a CSV (as a string) of a single day's attendance log:
    one row per student who scanned in that day.
    """
    target_date = date.fromisoformat(target_date_str) if target_date_str else date.today()

    all_users = get_all_users()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Full Name", "Department", "Date", "Time", "Status"])

    for user in all_users:
        logs = get_logs_for_user(user['id'], target_date.isoformat(), target_date.isoformat())
        for log in logs:
            formatted_time, is_late = format_log_time_and_late_flag(log['log_time'])
            writer.writerow([
                user['student_id'],
                user['full_name'],
                user['department'],
                log['log_date'].strftime('%Y-%m-%d'),
                formatted_time,
                "Late" if is_late else "Present",
            ])

    return output.getvalue(), target_date.isoformat()


def generate_monthly_csv(start_date_str=None, end_date_str=None):
    """
    Generates a CSV (as a string) of the class-wide monthly summary:
    one row per student with present/late/absent counts and percentage,
    plus a final totals row for the whole class.
    """
    summary = get_monthly_summary(start_date_str, end_date_str)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Full Name", "Department",
        "Present", "On Time", "Late", "Absent",
        "Attendance %", f"Range ({summary['range']['start_date']} to {summary['range']['end_date']})"
    ])

    for row in summary['students']:
        writer.writerow([
            row['student_id'], row['full_name'], row['department'],
            row['present'], row['on_time'], row['late'], row['absent'],
            row['attendance_percentage'], ""
        ])

    writer.writerow([])
    writer.writerow([
        "TOTALS", "", "",
        summary['totals']['total_present_marks'], "",
        summary['totals']['total_late_marks'], "",
        summary['totals']['class_average_percentage'], ""
    ])

    return output.getvalue(), summary['range']