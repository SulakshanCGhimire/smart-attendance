import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminStudentDetailModal.css';

const API_BASE = 'http://localhost:5000/api/admin';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

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

const buildCalendarGrid = (yearMonth, logs, registeredOn) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const todayStr = new Date().toISOString().split('T')[0];
  const logsByDate = Object.fromEntries(logs.map((log) => [log.date, log.status]));

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
    let status;
    if (dateStr > todayStr) status = 'upcoming';
    else if (dateStr < registeredOn) status = 'not-registered';
    else if (logsByDate[dateStr] === 'Late') status = 'late';
    else if (logsByDate[dateStr] === 'Present') status = 'present';
    else status = 'absent';
    cells.push({ day, dateStr, status });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

const AdminStudentDetailModal = ({ userId, onClose }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchDetail = useCallback(async (yearMonth) => {
    setLoading(true);
    setError('');
    try {
      const { startDate, endDate } = getMonthRange(yearMonth);
      const res = await axios.get(
        `${API_BASE}/student/${userId}/attendance?start_date=${startDate}&end_date=${endDate}`,
        authHeader()
      );
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load student attendance.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail(selectedMonth);
  }, [fetchDetail, selectedMonth]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="asd-overlay" onClick={onClose}>
      <div className="asd-modal" onClick={(e) => e.stopPropagation()}>
        <button className="asd-close-btn" onClick={onClose}>&times;</button>

        {loading && !report && <p className="asd-loading">Loading...</p>}
        {error && <p className="asd-error">{error}</p>}

        {report && (
          <>
            <div className="asd-header">
              <h2>{report.student.full_name}</h2>
              <p className="asd-subtitle">{report.student.student_id} &middot; {report.student.department}</p>
            </div>

            <div className="asd-month-picker">
              <label htmlFor="asdMonth">Month:</label>
              <input
                id="asdMonth"
                type="month"
                value={selectedMonth}
                max={currentMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>

            <div className="asd-stats-grid">
              <div className="asd-stat"><span className="asd-stat-value">{report.summary.total_present}</span><span className="asd-stat-label">Present</span></div>
              <div className="asd-stat"><span className="asd-stat-value">{report.summary.on_time}</span><span className="asd-stat-label">On Time</span></div>
              <div className="asd-stat"><span className="asd-stat-value asd-stat-late">{report.summary.late}</span><span className="asd-stat-label">Late</span></div>
              <div className="asd-stat"><span className="asd-stat-value">{report.summary.attendance_percentage}%</span><span className="asd-stat-label">Attendance</span></div>
            </div>

            <div className="asd-calendar-weekdays">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="asd-calendar-weekday">{d}</div>
              ))}
            </div>
            <div className="asd-calendar-grid">
              {buildCalendarGrid(selectedMonth, report.logs, report.summary.registered_on).map((week, wi) =>
                week.map((cell, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className={`asd-calendar-cell ${cell ? `asd-cal-${cell.status}` : 'asd-cal-blank'}`}
                  >
                    {cell ? cell.day : ''}
                  </div>
                ))
              )}
            </div>

            <h3 className="asd-history-title">History &mdash; {formatMonthLabel(selectedMonth)}</h3>
            {report.logs.length === 0 ? (
              <p className="asd-empty">No records for this month.</p>
            ) : (
              <table className="asd-table">
                <thead><tr><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {report.logs.map((log) => (
                    <tr key={log.date}>
                      <td>{log.display_date}</td>
                      <td>{log.time}</td>
                      <td><span className={`asd-badge asd-status-${log.status.toLowerCase()}`}>{log.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminStudentDetailModal;