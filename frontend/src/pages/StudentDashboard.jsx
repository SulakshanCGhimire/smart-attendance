import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentDashboard.css';

const API_BASE = 'http://localhost:5000/api/student';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('student_token')}` }
});

// Returns 'YYYY-MM' for the current month, used as the default selection.
const getCurrentYearMonth = () => new Date().toISOString().slice(0, 7);

// Given a 'YYYY-MM' string, returns { startDate, endDate } as 'YYYY-MM-DD'.
// endDate is clamped to today if the selected month is the current month
// (so a mid-July report doesn't claim days that haven't happened yet),
// otherwise it's the actual last day of that month.
const getMonthRange = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = `${yearMonth}-01`;

  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  const monthEndStr = `${yearMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const endDate = monthEndStr > todayStr ? todayStr : monthEndStr;

  return { startDate, endDate };
};

const formatMonthLabel = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Builds a full calendar grid for the given month, classifying every day as:
// - 'present' / 'late'   -> has a matching log entry
// - 'absent'             -> no log, but the day has already happened and
//                           the student was already registered by then
// - 'not-registered'     -> before the student's registration date (grayed
//                           out, not counted against them)
// - 'upcoming'           -> today or in the future (grayed out, hasn't
//                           happened yet so there's nothing to show)
// Returns an array of week-rows, each row an array of 7 cells (or null for
// leading/trailing blanks so the grid aligns under Sun..Sat headers).
const buildCalendarGrid = (yearMonth, logs, registeredOn) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday

  const todayStr = new Date().toISOString().split('T')[0];
  const logsByDate = Object.fromEntries(logs.map((log) => [log.date, log.status]));

  const cells = [];

  // Leading blanks so day 1 lines up under the correct weekday column
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;

    let status;
    if (dateStr > todayStr) {
      status = 'upcoming';
    } else if (dateStr < registeredOn) {
      status = 'not-registered';
    } else if (logsByDate[dateStr] === 'Late') {
      status = 'late';
    } else if (logsByDate[dateStr] === 'Present') {
      status = 'present';
    } else {
      status = 'absent';
    }

    cells.push({ day, dateStr, status });
  }

  // Trailing blanks to complete the final week row
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
};

const StudentDashboard = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());

  const [checkDate, setCheckDate] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    navigate('/student/login');
  };

  const fetchReport = useCallback(async (yearMonth) => {
    setLoading(true);
    setError('');
    try {
      const { startDate, endDate } = getMonthRange(yearMonth);
      const res = await axios.get(
        `${API_BASE}/attendance?start_date=${startDate}&end_date=${endDate}`,
        authHeader()
      );
      setReport(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('student_token');
        navigate('/student/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to load attendance report.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchReport(selectedMonth);
  }, [fetchReport, selectedMonth]);

  const handleCheckDate = async (e) => {
    e.preventDefault();
    if (!checkDate) return;

    setCheckLoading(true);
    setCheckResult(null);
    try {
      const res = await axios.get(`${API_BASE}/attendance/check?date=${checkDate}`, authHeader());
      setCheckResult(res.data);
    } catch (err) {
      setCheckResult({ error: err.response?.data?.error || 'Could not check that date.' });
    } finally {
      setCheckLoading(false);
    }
  };

  if (loading && !report) {
    return <div className="sd-container"><p className="sd-loading">Loading your attendance...</p></div>;
  }

  if (error) {
    return (
      <div className="sd-container">
        <p className="sd-error">{error}</p>
        <button className="sd-btn" onClick={() => fetchReport(selectedMonth)}>Retry</button>
      </div>
    );
  }

  const { student, summary, logs } = report;
  const currentMonth = getCurrentYearMonth();

  return (
    <div className="sd-container">
      <header className="sd-header">
        <div>
          <h1>{student.full_name}</h1>
          <p className="sd-subtitle">{student.student_id} &middot; {student.department}</p>
        </div>
        <button className="sd-logout-btn" onClick={handleLogout}>Log Out</button>
      </header>

      <section className="sd-month-picker">
        <label htmlFor="monthSelect">Viewing attendance for:</label>
        <input
          id="monthSelect"
          type="month"
          value={selectedMonth}
          max={currentMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </section>

      <section className="sd-stats-grid">
        <div className="sd-stat-card">
          <span className="sd-stat-value">{summary.total_present}</span>
          <span className="sd-stat-label">Total Attendance</span>
          <span className="sd-stat-sublabel">out of {summary.range_days} day{summary.range_days !== 1 ? 's' : ''}</span>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-value">{summary.on_time}</span>
          <span className="sd-stat-label">On Time</span>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-value sd-stat-late">{summary.late}</span>
          <span className="sd-stat-label">Late</span>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-value">{summary.attendance_percentage}%</span>
          <span className="sd-stat-label">This Month</span>
        </div>
      </section>

      <section className="sd-check-section">
        <h2>Check a specific date</h2>
        <form className="sd-check-form" onSubmit={handleCheckDate}>
          <input
            type="date"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            required
          />
          <button type="submit" className="sd-btn" disabled={checkLoading}>
            {checkLoading ? 'Checking...' : 'Check'}
          </button>
        </form>

        {checkResult && !checkResult.error && (
          <div className={`sd-check-result sd-status-${checkResult.status.toLowerCase()}`}>
            <strong>{checkResult.date}:</strong> {checkResult.status}
            {checkResult.time && <span> at {checkResult.time}</span>}
          </div>
        )}
        {checkResult?.error && (
          <div className="sd-check-result sd-status-error">{checkResult.error}</div>
        )}
      </section>

      <section className="sd-calendar-section">
        <h2>Calendar ({formatMonthLabel(selectedMonth)})</h2>
        <div className="sd-calendar-legend">
          <span><i className="sd-legend-dot sd-legend-present"></i> Present</span>
          <span><i className="sd-legend-dot sd-legend-late"></i> Late</span>
          <span><i className="sd-legend-dot sd-legend-absent"></i> Absent</span>
          <span><i className="sd-legend-dot sd-legend-muted"></i> N/A</span>
        </div>
        <div className="sd-calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="sd-calendar-weekday">{d}</div>
          ))}
        </div>
        <div className="sd-calendar-grid">
          {buildCalendarGrid(selectedMonth, logs, summary.registered_on).map((week, wi) => (
            week.map((cell, di) => (
              <div
                key={`${wi}-${di}`}
                className={`sd-calendar-cell ${cell ? `sd-cal-${cell.status}` : 'sd-cal-blank'}`}
              >
                {cell ? cell.day : ''}
              </div>
            ))
          ))}
        </div>
      </section>

      <section className="sd-history-section">
        <h2>Attendance History  ({formatMonthLabel(selectedMonth)})</h2>
        {logs.length === 0 ? (
          <p className="sd-empty">No attendance records for this month.</p>
        ) : (
          <table className="sd-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.date}>
                  <td>{log.display_date}</td>
                  <td>{log.time}</td>
                  <td>
                    <span className={`sd-badge sd-status-${log.status.toLowerCase()}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default StudentDashboard;