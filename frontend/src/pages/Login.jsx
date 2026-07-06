import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password,
      });

      localStorage.setItem('token', res.data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#111827',
          padding: '2rem',
          borderRadius: '12px',
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h2 style={{ margin: 0, textAlign: 'center' }}>Admin Login</h2>

        {error && (
          <div style={{ color: '#f87171', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #374151', background: '#1f2937', color: 'white' }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #374151', background: '#1f2937', color: 'white' }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.7rem',
            borderRadius: '6px',
            border: 'none',
            background: '#2563eb',
            color: 'white',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;