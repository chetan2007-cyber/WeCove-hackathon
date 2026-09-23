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

  test('2. Authentication Interface: Role Selection, Unified Credential Input, and Registration Navigation', async () => {
    render(<App />);

    // Check Role selection buttons
    const patientRole = await screen.findByRole('button', { name: /Patient/i });
    const caregiverRole = await screen.findByRole('button', { name: /Caregiver/i });
    expect(patientRole).toBeInTheDocument();
    expect(caregiverRole).toBeInTheDocument();

    // Check Credential input
    const credentialInput = screen.getByPlaceholderText(/name@smriti\.care or 9876543210/i);
    expect(credentialInput).toBeInTheDocument();

    // Check Password input
    const passwordInput = screen.getByPlaceholderText(/characters|password/i);
    expect(passwordInput).toBeInTheDocument();

    // Check Navigation to Register tab
    const createAccountTab = screen.getByRole('button', { name: /Create Account/i });
    expect(createAccountTab).toBeInTheDocument();
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
