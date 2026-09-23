import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Enterprise ProtectedRoute Component
 * - Verifies local session presence and verified status
 * - Performs role-based authorization matching
 * - Asynchronously verifies session with backend API
 * - Rejects unauthorized URL direct entry
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const [sessionValid, setSessionValid] = useState(() => authService.isAuthenticated());

  const user = authService.getCurrentUser();
  const token = authService.getStoredToken();

  useEffect(() => {
    let isMounted = true;

    async function checkServerSession() {
      if (!authService.isAuthenticated()) {
        if (isMounted) {
          setSessionValid(false);
        }
        return;
      }

      try {
        const verified = await authService.verifySession();
        if (isMounted) {
          if (!verified) {
            setSessionValid(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          // If server rejects with 401/403, session is invalid
          if (err.status === 401 || err.status === 403) {
            setSessionValid(false);
          }
        }
      }
    }

    checkServerSession();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  // 1. Instant check: If no authenticated session exists, block and redirect immediately
  if (!user || !token || !sessionValid) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 2. Role-based Authorization Matrix
  const userRole = (user.role || '').toLowerCase();
  const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

  if (allowedRoles.length > 0 && !normalizedAllowed.includes(userRole)) {
    // Role mismatch: redirect to authorized home or login
    if (userRole === 'patient') return <Navigate to="/patient" replace />;
    if (userRole === 'caregiver') return <Navigate to="/caregiver" replace />;
    if (userRole.includes('health') || userRole.includes('clinic')) return <Navigate to="/healthcare" replace />;
    return <Navigate to="/login" replace />;
  }

  // 3. Authorized access granted
  return children;
}