import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ db_id: '', student_id: '', full_name: '', department: '', email: '' });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Assuming backend is running on standard port, but using relative paths if proxied
      // For Vite, usually api requests need to hit the exact backend URL. Let's assume port 5000 as typical.
      const response = await axios.get('http://localhost:5000/api/users/', authHeader());
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setError("Failed to load users. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser({ ...user });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/users/${editingUser.id}`, {
        student_id: editingUser.student_id,
        full_name: editingUser.full_name,
        department: editingUser.department,
        email: editingUser.email
      }, authHeader());
      setEditingUser(null);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Failed to update user. Duplicate ID or Email?");
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${userId}`, authHeader());
        fetchUsers(); // Refresh the list
      } catch (err) {
        console.error("Error deleting user:", err);
        alert("Failed to delete user.");
      }
    }
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/users/register', newUser, authHeader());
      setAddingUser(false);
      setNewUser({ db_id: '', student_id: '', full_name: '', department: '', email: '' });
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error("Error adding user:", err);
      alert(err.response?.data?.error || "Failed to add user. Duplicate ID or Email?");
    }
  };

  return (
    <div className="user-management-container">
      <div className="um-header">
        <div className="header-title">
          <h1>User Database</h1>
          <p>Manage all registered students securely</p>
        </div>
        <div className="header-actions">
          <button className="add-btn" onClick={() => setAddingUser(true)}>
            + Add New User
          </button>
          <button className="back-btn" onClick={() => navigate('/admin')}>
            &larr; Back to Admin
          </button>
        </div>
      </div>

      {error && <div className="um-error">{error}</div>}

      <div className="um-card">
        {loading ? (
          <div className="um-loading">
            <div className="spinner"></div>
            <p>Loading records...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="um-table">
              <thead>
                <tr>
                  <th>DB ID</th>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Date Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">No users found.</td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id}>
                      <td className="fw-500">#{user.id}</td>
                      <td className="fw-500">{user.student_id}</td>
                      <td>{user.full_name}</td>
                      <td>
                        <span className="dept-badge">{user.department}</span>
                      </td>
                      <td className="text-muted">{user.email}</td>
                      <td className="text-muted">{user.created_at || 'N/A'}</td>
                      <td>
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEditClick(user)}
                        >
                          Edit
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(user.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="um-modal-overlay">
          <div className="um-modal">
            <h2>Edit Student Record</h2>
            <p className="modal-subtitle">Update information for {editingUser.full_name}</p>
            <form onSubmit={handleEditSubmit} className="um-form">
              <div className="form-group">
                <label>Student ID</label>
                <input 
                  type="text" 
                  name="student_id" 
                  value={editingUser.student_id} 
                  onChange={handleEditChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="full_name" 
                  value={editingUser.full_name} 
                  onChange={handleEditChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input 
                  type="text" 
                  name="department" 
                  value={editingUser.department} 
                  onChange={handleEditChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={editingUser.email} 
                  onChange={handleEditChange} 
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addingUser && (
        <div className="um-modal-overlay">
          <div className="um-modal">
            <h2>Add New Student</h2>
            <p className="modal-subtitle">Register a new student in the database</p>
            <form onSubmit={handleAddSubmit} className="um-form">
              <div className="form-group">
                <label>Database ID (Optional)</label>
                <input 
                  type="number" 
                  name="db_id" 
                  value={newUser.db_id} 
                  onChange={handleAddChange} 
                  placeholder="Auto-assigned if left blank"
                />
              </div>
              <div className="form-group">
                <label>Student ID</label>
                <input 
                  type="text" 
                  name="student_id" 
                  value={newUser.student_id} 
                  onChange={handleAddChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="full_name" 
                  value={newUser.full_name} 
                  onChange={handleAddChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input 
                  type="text" 
                  name="department" 
                  value={newUser.department} 
                  onChange={handleAddChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={newUser.email} 
                  onChange={handleAddChange} 
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setAddingUser(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
