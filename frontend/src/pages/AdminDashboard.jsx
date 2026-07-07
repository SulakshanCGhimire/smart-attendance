import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import axios from 'axios';
import AdminStudentDetailModal from '../components/AdminStudentDetailModal';
import './AdminDashboard.css';

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '55%', height: '55%' }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  // State for real data
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [logs, setLogs] = useState([]);

  // Fetch live data from Flask
  useEffect(() => {
    if (activeTab === 'overview') {
      const fetchDailyData = async () => {
        try {
          const res = await axios.get('http://localhost:5000/api/admin/daily-stats', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setStats(res.data.stats);
          setLogs(res.data.logs);
        } catch (err) {
          console.error("Failed to fetch dashboard data:", err);
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
          }
        }
      };
      fetchDailyData();
    }
  }, [activeTab, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // --- CSV export (shared helper: fetches a blob and triggers a download) ---
  const downloadCsv = async (url, fallbackFilename) => {
    try {
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
      });

      const contentDisposition = res.headers['content-disposition'];
      const match = contentDisposition && contentDisposition.match(/filename=(.+)/);
      const filename = match ? match[1] : fallbackFilename;

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('CSV export failed:', err);
      alert('Failed to export CSV.');
    }
  };

  const handleExportDailyCsv = () => {
    downloadCsv('http://localhost:5000/api/admin/export/daily-csv', 'attendance_today.csv');
  };

  // --- Monthly Report tab state ---
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const getMonthRange = (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = `${yearMonth}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];
    const monthEndStr = `${yearMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;
    const endDate = monthEndStr > todayStr ? todayStr : monthEndStr;
    return { startDate, endDate };
  };

  const fetchMonthlySummary = useCallback(async (yearMonth) => {
    setMonthlyLoading(true);
    try {
      const { startDate, endDate } = getMonthRange(yearMonth);
      const res = await axios.get(
        `http://localhost:5000/api/admin/monthly-summary?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setMonthlySummary(res.data);
    } catch (err) {
      console.error('Failed to fetch monthly summary:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setMonthlyLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlySummary(reportMonth);
    }
  }, [activeTab, reportMonth, fetchMonthlySummary]);

  const handleExportMonthlyCsv = () => {
    const { startDate, endDate } = getMonthRange(reportMonth);
    downloadCsv(
      `http://localhost:5000/api/admin/export/monthly-csv?start_date=${startDate}&end_date=${endDate}`,
      `monthly_report_${reportMonth}.csv`
    );
  };

  // Registration State
  const webcamRef = useRef(null);
  const [regUserId, setRegUserId] = useState('');
  const [regStatus, setRegStatus] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUserId) { setRegStatus('Please enter a User ID'); return; }

    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) { setRegStatus('Camera not ready'); return; }

    setRegStatus('Processing registration...');

    const fetchRes = await fetch(imageSrc);
    const blob = await fetchRes.blob();
    const file = new File([blob], "face.jpg", { type: "image/jpeg" });

    const formData = new FormData();
    formData.append('user_id', regUserId);
    formData.append('image', file);

    try {
      const res = await axios.post('http://localhost:5000/api/faces/register', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRegStatus(`Success: ${res.data.message}`);
      setRegUserId('');
    } catch (err) {
      setRegStatus(`Error: ${err.response?.data?.error || 'Registration failed'}`);
    }
  };

  return (
    <div className="admin-container">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="logo-icon-small"><UserIcon /></div>
          <h2>ADMIN PANEL</h2>
        </div>
        <nav className="sidebar-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            System Overview
          </button>
          <button className={activeTab === 'register' ? 'active' : ''} onClick={() => setActiveTab('register')}>
            Register Student
          </button>
          <button className={activeTab === 'monthly' ? 'active' : ''} onClick={() => setActiveTab('monthly')}>
            Monthly Report
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            Settings
          </button>
          <button onClick={() => window.location.href='/admin/users'}>
            User Management
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        <header className="main-header">
          <h1>{activeTab === 'overview' ? 'Daily Attendance Overview' : activeTab === 'register' ? 'Student Biometric Registration' : activeTab === 'monthly' ? 'Monthly Attendance Report' : 'System Configuration'}</h1>
          <p className="date-display">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </header>

        {activeTab === 'overview' && (
          <>
            <div className="stats-grid">
              <div className="stat-card"><h3>Total Students</h3><p className="stat-number text-blue">{stats.total}</p></div>
              <div className="stat-card"><h3>Present</h3><p className="stat-number text-green">{stats.present}</p></div>
              <div className="stat-card"><h3>Late</h3><p className="stat-number text-orange">{stats.late}</p></div>
              <div className="stat-card"><h3>Absent</h3><p className="stat-number text-red">{stats.absent}</p></div>
            </div>

            <div className="table-container">
              <div className="table-header">
                <h3>Recent Scan Logs</h3>
                <button className="export-btn" onClick={handleExportDailyCsv}>Export CSV</button>
              </div>
              <table className="admin-table">
                <thead><tr><th>Log ID</th><th>Student Name</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>#{log.id}</td><td className="fw-bold">{log.name}</td><td>{log.date}</td><td>{log.time}</td>
                      <td><span className={`status-badge ${log.status.toLowerCase()}`}>{log.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'register' && (
          <div className="register-container">
            <form className="register-form" onSubmit={handleRegister}>
              <h3>Step 1: Link Database User</h3>
              <div className="form-group">
                <label>Database User ID</label>
                <input 
                  type="number" 
                  value={regUserId} 
                  onChange={(e) => setRegUserId(e.target.value)} 
                  placeholder="e.g., 1" 
                  required 
                />
              </div>
              <p className="reg-note">Ensure the user exists in the 'users' table before capturing biometrics.</p>
              
              <div className="reg-status-box">
                <p className={regStatus.startsWith('Success') ? 'text-green' : regStatus.startsWith('Error') ? 'text-red' : 'text-blue'}>
                  {regStatus || 'Awaiting input...'}
                </p>
              </div>
            </form>

            <div className="register-camera">
              <h3>Step 2: Capture Biometrics</h3>
              <div className="cam-wrapper">
                <Webcam 
                  audio={false} 
                  ref={webcamRef} 
                  screenshotFormat="image/jpeg" 
                  className="reg-webcam"
                  videoConstraints={{ facingMode: "user" }} 
                  mirrored={false}
                />
              </div>
              <button className="capture-btn" onClick={handleRegister}>CAPTURE & SAVE ENCODING</button>
            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="monthly-report-container">
            <div className="monthly-report-controls">
              <label htmlFor="reportMonth">Month:</label>
              <input
                id="reportMonth"
                type="month"
                value={reportMonth}
                max={new Date().toISOString().slice(0, 7)}
                onChange={(e) => setReportMonth(e.target.value)}
              />
              <button className="export-btn" onClick={handleExportMonthlyCsv}>Export Monthly CSV</button>
            </div>

            {monthlyLoading ? (
              <div className="um-loading"><div className="spinner"></div><p>Loading report...</p></div>
            ) : monthlySummary && (
              <>
                <div className="stats-grid">
                  <div className="stat-card"><h3>Students</h3><p className="stat-number text-blue">{monthlySummary.totals.total_students}</p></div>
                  <div className="stat-card"><h3>Total Present</h3><p className="stat-number text-green">{monthlySummary.totals.total_present_marks}</p></div>
                  <div className="stat-card"><h3>Total Late</h3><p className="stat-number text-orange">{monthlySummary.totals.total_late_marks}</p></div>
                  <div className="stat-card"><h3>Class Average</h3><p className="stat-number text-blue">{monthlySummary.totals.class_average_percentage}%</p></div>
                </div>

                <div className="table-container">
                  <div className="table-header">
                    <h3>Per-Student Summary</h3>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Student ID</th><th>Name</th><th>Department</th>
                        <th>Present</th><th>Late</th><th>Absent</th><th>%</th><th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.students.map((row) => (
                        <tr key={row.user_id}>
                          <td>{row.student_id}</td>
                          <td className="fw-bold">{row.full_name}</td>
                          <td>{row.department}</td>
                          <td>{row.present}</td>
                          <td>{row.late}</td>
                          <td>{row.absent}</td>
                          <td>{row.attendance_percentage}%</td>
                          <td>
                            <button className="action-btn edit-btn" onClick={() => setSelectedStudentId(row.user_id)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-container">
            <div className="settings-card">
              <h3>Scanner & Voice Settings</h3>
              <div className="form-group">
                <label>Face Recognition Strictness (Lower = Stricter, Default: 0.5)</label>
                <input type="number" step="0.1" defaultValue="0.5" />
              </div>
              <div className="form-group">
                <label>Time Between Camera Scans (in milliseconds)</label>
                <input type="number" defaultValue="3000" />
              </div>
              <div className="form-group row">
                <input type="checkbox" id="voiceToggle" defaultChecked />
                <label htmlFor="voiceToggle">Enable Voice Greetings</label>
              </div>
              <button className="save-btn mt-2">Save Configuration</button>
            </div>
          </div>
        )}
      </main>

      {selectedStudentId && (
        <AdminStudentDetailModal
          userId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;