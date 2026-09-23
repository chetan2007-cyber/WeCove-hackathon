import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('token');

  // 1. If not logged in, redirect to login page
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Normalize role comparison
  const userRole = (user.role || '').toLowerCase();
  const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

  if (allowedRoles.length > 0 && !normalizedAllowed.includes(userRole)) {
    if (userRole === 'patient') return <Navigate to="/patient" replace />;
    if (userRole === 'caregiver') return <Navigate to="/caregiver" replace />;
    if (userRole.includes('health') || userRole.includes('clinic')) return <Navigate to="/healthcare" replace />;
    return <Navigate to="/login" replace />;
  }

  // 3. Authorized
  return children;
}