import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScannerUI from './pages/ScannerUI';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import StudentLogin from './pages/StudentLogin';
import StudentDashboard from './pages/StudentDashboard';
import StudentProtectedRoute from './components/StudentProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ScannerUI />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        <Route path="/student/login" element={<StudentLogin />} />
        <Route
          path="/student/dashboard"
          element={
            <StudentProtectedRoute>
              <StudentDashboard />
            </StudentProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;