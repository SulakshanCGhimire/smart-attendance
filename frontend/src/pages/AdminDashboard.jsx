import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import './AdminDashboard.css';

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '55%', height: '55%' }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for real data
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [logs, setLogs] = useState([]);

  // Fetch live data from Flask
  useEffect(() => {
    if (activeTab === 'overview') {
      const fetchDailyData = async () => {
        try {
          const res = await axios.get('http://localhost:5000/api/admin/daily-stats');
          setStats(res.data.stats);
          setLogs(res.data.logs);
        } catch (err) {
          console.error("Failed to fetch dashboard data:", err);
        }
      };
      fetchDailyData();
    }
  }, [activeTab]);

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
      const res = await axios.post('http://localhost:5000/api/faces/register', formData);
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
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn">Log Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        <header className="main-header">
          <h1>{activeTab === 'overview' ? 'Daily Attendance Overview' : activeTab === 'register' ? 'Student Biometric Registration' : 'System Configuration'}</h1>
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
                <button className="export-btn"> Export CSV</button>
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
                />
              </div>
              <button className="capture-btn" onClick={handleRegister}>CAPTURE & SAVE ENCODING</button>
            </div>
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
    </div>
  );
};

export default AdminDashboard;