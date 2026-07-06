import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Wraps a route element and redirects to /login if no auth token is present.
 * Note: this only checks that a token EXISTS in localStorage - it does not
 * verify the token is still valid/unexpired. Actual validity is checked
 * server-side (token_required decorator); a 401 response from any protected
 * API call should also redirect to /login
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;