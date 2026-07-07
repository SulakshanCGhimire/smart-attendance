import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Wraps a student-facing route and redirects to /student/login if no
 * student auth token is present. Deliberately checks a DIFFERENT
 * localStorage key ('student_token') than the admin ProtectedRoute
 * ('token'), so an admin session and a student session can never be
 * confused for each other on the same browser/device.
 */
const StudentProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('student_token');

  if (!token) {
    return <Navigate to="/student/login" replace />;
  }

  return children;
};

export default StudentProtectedRoute;