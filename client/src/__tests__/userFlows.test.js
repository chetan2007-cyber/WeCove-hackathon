import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import authService, { normalizeIndianPhone, isValidEmail } from '../services/authService';

describe('Security, Authentication & User Flow Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('1. Security Test: Direct Protected Route Access Without Authentication Redirects to Login', async () => {
    render(<App />);

    // When localStorage is empty, user is unauthenticated
    expect(authService.isAuthenticated()).toBe(false);

    // App should immediately render the Login screen
    const welcomeHeading = await screen.findByText(/Welcome back/i);
    expect(welcomeHeading).toBeInTheDocument();
  });

  test('2. Authentication Options: Phone and Email Mode Switching', async () => {
    render(<App />);

    // Find authentication mode buttons
    const phoneBtn = await screen.findByRole('button', { name: /Continue with Phone/i });
    const emailBtn = await screen.findByRole('button', { name: /Continue with Email/i });

    expect(phoneBtn).toBeInTheDocument();
    expect(emailBtn).toBeInTheDocument();

    // Default is Phone
    expect(screen.getByText(/Mobile Number \(\+91\)/i)).toBeInTheDocument();

    // Switch to Email
    fireEvent.click(emailBtn);
    expect(screen.getByText(/Email Address/i)).toBeInTheDocument();

    // Switch back to Phone
    fireEvent.click(phoneBtn);
    expect(screen.getByText(/Mobile Number \(\+91\)/i)).toBeInTheDocument();
  });

  test('3. Phone Normalization & Validation Rules', () => {
    // Valid 10-digit Indian numbers
    const valid1 = normalizeIndianPhone('9876543210');
    expect(valid1.isValid).toBe(true);
    expect(valid1.normalized).toBe('+919876543210');

    const valid2 = normalizeIndianPhone('+91 98765 43210');
    expect(valid2.isValid).toBe(true);
    expect(valid2.normalized).toBe('+919876543210');

    const valid3 = normalizeIndianPhone('09876543210');
    expect(valid3.isValid).toBe(true);
    expect(valid3.normalized).toBe('+919876543210');

    // Invalid numbers
    const invalidShort = normalizeIndianPhone('98765');
    expect(invalidShort.isValid).toBe(false);

    const invalidPrefix = normalizeIndianPhone('1234567890');
    expect(invalidPrefix.isValid).toBe(false);

    const empty = normalizeIndianPhone('');
    expect(empty.isValid).toBe(false);
  });

  test('4. Email Validation Rules', () => {
    expect(isValidEmail('patient@smriti.care')).toBe(true);
    expect(isValidEmail('caregiver.ananya@family.org')).toBe(true);
    expect(isValidEmail('dr.barua@clinic.hospital.in')).toBe(true);

    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing-domain@')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  test('5. Session Lifecycle: Persistence, Verification, and Logout', async () => {
    // Initially unauthenticated
    expect(authService.isAuthenticated()).toBe(false);

    // Simulate authenticated session creation after OTP verification
    const verifiedUser = {
      _id: 'user-auth-uuid-99',
      id: 'user-auth-uuid-99',
      name: 'Rupali Devi',
      phone: '+919876543210',
      role: 'Patient',
      isVerified: true
    };
    authService.persistSession(verifiedUser, 'verified-jwt-token-production-2026');

    // Confirm session is valid
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getCurrentUser().name).toBe('Rupali Devi');
    expect(authService.getStoredToken()).toBe('verified-jwt-token-production-2026');

    // Perform Logout
    await authService.logout();

    // Confirm complete session invalidation
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getCurrentUser()).toBeNull();
    expect(authService.getStoredToken()).toBeNull();
  });
});
