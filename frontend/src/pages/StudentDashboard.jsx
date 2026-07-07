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

      <section className="sd-history-section">
        <h2>Attendance History ({formatMonthLabel(selectedMonth)})</h2>
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