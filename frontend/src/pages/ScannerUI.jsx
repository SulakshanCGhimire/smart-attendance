import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import './ScannerUI.css';

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '55%', height: '55%' }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const ScannerUI = () => {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState('AUTHENTICATING...');
  const [subMessage, setSubMessage] = useState('Please look at the camera');
  const [lastScan, setLastScan] = useState(null);
  const [recentScans, setRecentScans] = useState([]); 

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const captureAndSend = useCallback(async () => {
    if (status !== 'AUTHENTICATING...' || !webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setStatus('PROCESSING...');
    setSubMessage('Analyzing biometric data...');

    const fetchRes = await fetch(imageSrc);
    const blob = await fetchRes.blob();
    const file = new File([blob], "frame.jpg", { type: "image/jpeg" });

    const formData = new FormData();
    formData.append('frame', file);

    try {
      const response = await axios.post('http://localhost:5000/api/attendance/recognize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setStatus('SUCCESS');
      setSubMessage('Identity verified.');
      
      const newScan = {
        name: response.data.user,
        status: response.data.is_duplicate ? "Already Marked" : "Marked Present",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        color: response.data.is_duplicate ? 'orange' : 'green'
      };

      setLastScan(newScan);
      setRecentScans(prev => [newScan, ...prev].slice(0, 4)); 

      setTimeout(resetScanner, 4000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || '';
      
      if (errorMsg.includes("No face detected")) {
         resetScanner(); 
      } else {
         setStatus('FAILED');
         setSubMessage(errorMsg || 'Recognition failed.');
         setTimeout(resetScanner, 3000);
      }
    }
  }, [status, webcamRef]);

  const resetScanner = () => {
    setStatus('AUTHENTICATING...');
    setSubMessage('Please look at the camera');
  };

  // Auto-Scan Loop
  useEffect(() => {
    let interval;
    if (status === 'AUTHENTICATING...') {
      interval = setInterval(() => {
        captureAndSend();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [status, captureAndSend]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-icon"><UserIcon /></div>
        <div>
          <h1>SMART ATTENDANCE SYSTEM</h1>
          <h2>FACE RECOGNITION ATTENDANCE</h2>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* LEFT COLUMN */}
        <div className="left-column">
          <div className="scanner-card">
            <div className="live-badge"><span className="dot"></span> LIVE</div>
            
            <div className="webcam-wrapper">
              <Webcam 
                audio={false} 
                ref={webcamRef} 
                screenshotFormat="image/jpeg" 
                className="webcam-feed"
                videoConstraints={{ facingMode: "user" }} 
              />
              <div className="scanner-overlay">
                <div className="corner top-left"></div>
                <div className="corner top-right"></div>
                <div className="corner bottom-left"></div>
                <div className="corner bottom-right"></div>
              </div>
            </div>

            <div className="status-banner">
              <p>STATUS: <span className={status === 'SUCCESS' ? 'text-green' : status === 'FAILED' ? 'text-red' : 'text-blue'}>{status}</span></p>
              <small>{subMessage}</small>
            </div>
          </div>

          <div className="result-card">
            <div className="result-info">
              <div className="icon success-icon">✓</div>
              <div>
                <h4>ATTENDANCE</h4>
                <p className={lastScan?.color === 'orange' ? "text-orange" : "text-green"}>
                  {lastScan ? lastScan.status.toUpperCase() : "WAITING..."}
                </p>
              </div>
            </div>
            <div className="result-info">
              <div className="icon user-icon"><UserIcon /></div>
              <div>
                <h4>NAME</h4>
                <p>{lastScan ? lastScan.name : "---"}</p>
              </div>
            </div>
            <div className="result-info">
              <div className="icon time-icon">⏱</div>
              <div>
                <h4>TIME</h4>
                <p>{lastScan ? lastScan.time : "---"}</p>
                <small>{lastScan ? lastScan.date : ""}</small>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-column">
          <div className="activity-card">
            <div className="activity-header">
              <h3>RECENT ACTIVITY</h3>
              <span>≡</span>
            </div>
            <ul className="activity-list">
              {recentScans.length === 0 ? (
                <li className="empty-state">No scans yet today.</li>
              ) : (
                recentScans.map((act, i) => (
                  <li key={i}>
                    <div className="avatar">{getInitials(act.name)}</div>
                    <div className="activity-details">
                      <p className="name">{act.name}</p>
                      <p className={`status ${act.color}`}>● {act.status}</p>
                    </div>
                    <div className="activity-time">
                      <p>{act.time}</p>
                      <small>{act.date}</small>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerUI;