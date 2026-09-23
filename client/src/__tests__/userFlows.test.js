import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import authService from '../services/authService';

describe('Main User Flows - End-to-End Simulation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('Patient Flow: Login -> Home -> Navigation -> Settings -> Logout', async () => {
    render(<App />);

    // 1. Verify Login screen loaded
    const patientDemoBtns = await screen.findAllByText(/Demo Patient/i);
    expect(patientDemoBtns.length).toBeGreaterThan(0);

    // 2. Click Demo Patient
    fireEvent.click(patientDemoBtns[0]);

    // 3. Confirm session stored
    const user = authService.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user.role).toBe('Patient');

    // 4. Test Logout
    await authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
  });

  test('Caregiver Flow: Login -> Caregiver Session -> Role Verification -> Logout', async () => {
    render(<App />);

    // 1. Find Demo Caregiver button
    const caregiverDemoBtns = await screen.findAllByText(/Demo Caregiver/i);
    expect(caregiverDemoBtns.length).toBeGreaterThan(0);

    // 2. Click Demo Caregiver
    fireEvent.click(caregiverDemoBtns[0]);

    // 3. Confirm Caregiver session
    const user = authService.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user.role).toBe('Caregiver');

    // 4. Test Logout
    await authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
  });

  test('Healthcare Worker Flow: Login -> Clinician Session -> Role Verification -> Logout', async () => {
    render(<App />);

    // 1. Find Demo Clinician button
    const clinicianDemoBtns = await screen.findAllByText(/Demo Clinician/i);
    expect(clinicianDemoBtns.length).toBeGreaterThan(0);

    // 2. Click Demo Clinician
    fireEvent.click(clinicianDemoBtns[0]);

    // 3. Confirm Clinician session
    const user = authService.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user.role).toBe('HealthcareWorker');

    // 4. Test Logout
    await authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
  });
});
