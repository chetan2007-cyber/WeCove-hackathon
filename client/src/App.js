import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import CaregiverDashboard from './pages/CaregiverDashboard';
import PatientHome from './pages/PatientHome';
import HealthcareDashboard from './pages/HealthcareDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import MemoryJourney from './pages/MemoryJourney';
import PatientMemories from './pages/PatientMemories';
import PatientReminders from './pages/PatientReminders';
import PatientCompanion from './pages/PatientCompanion';
import PatientMyDay from './pages/PatientMyDay';
import PatientSettings from './pages/PatientSettings';
import CaregiverPatientDetails from './pages/CaregiverPatientDetails';
import CaregiverMemoryVault from './pages/CaregiverMemoryVault';
import MemoryConstellation from './pages/MemoryConstellation';
import CaregiverSchedule from './pages/CaregiverSchedule';
import PatientReels from './pages/PatientReels';
import { LanguageProvider } from './context/LanguageContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function App() {
  return (
    <GoogleOAuthProvider clientId="348524516027-3o5bt9i4naobtn7kaqusqmisf11j3h51.apps.googleusercontent.com">
      <LanguageProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          
          {/* Protected Patient Routes */}
          <Route path="/patient" element={
            <ProtectedRoute allowedRoles={['Patient']}>
              <PatientHome />
            </ProtectedRoute>
          } />
          <Route path="/patient/reels" element={
            <ProtectedRoute allowedRoles={['Patient']}>
              <PatientReels />
            </ProtectedRoute>
          } />
          <Route path="/patient/memories" element={
            <ProtectedRoute allowedRoles={['Patient']}>
              <PatientMemories />
            </ProtectedRoute>
          } />
          <Route path="/patient/reminders" element={
            <ProtectedRoute allowedRoles={['Patient']}>
              <PatientReminders />
            </ProtectedRoute>
          } />
          <Route path="/patient/companion" element={
            <ProtectedRoute allowedRoles={['Patient']}>
              <PatientCompanion />
            </ProtectedRoute>
          } />
          <Route path="/patient/my-day" element={
            <ProtectedRoute allowedRoles={['Patient']}>
              <PatientMyDay />
            </ProtectedRoute>
          } />
          <Route path="/patient/settings" element={
            <ProtectedRoute allowedRoles={['Patient']}>
              <PatientSettings />
            </ProtectedRoute>
          } />
          <Route path="/journey" element={
            <ProtectedRoute allowedRoles={['Patient', 'Caregiver']}>
              <MemoryJourney />
            </ProtectedRoute>
          } />
          <Route path="/patient/memory-journey/:nodeId" element={
            <ProtectedRoute allowedRoles={['Patient', 'Caregiver']}>
              <MemoryJourney />
            </ProtectedRoute>
          } />
          <Route path="/patient/constellation" element={
            <ProtectedRoute allowedRoles={['Patient', 'Caregiver']}>
              <MemoryConstellation />
            </ProtectedRoute>
          } />

          {/* Protected Caregiver Routes */}
          <Route path="/caregiver" element={
            <ProtectedRoute allowedRoles={['Caregiver']}>
              <CaregiverDashboard />
            </ProtectedRoute>
          } />
          <Route path="/caregiver/vault" element={
            <ProtectedRoute allowedRoles={['Caregiver']}>
              <CaregiverMemoryVault />
            </ProtectedRoute>
          } />
          <Route path="/caregiver/schedule" element={
            <ProtectedRoute allowedRoles={['Caregiver']}>
              <CaregiverSchedule />
            </ProtectedRoute>
          } />
          <Route path="/caregiver/patient/:patientId" element={
            <ProtectedRoute allowedRoles={['Caregiver']}>
              <CaregiverPatientDetails />
            </ProtectedRoute>
          } />

          {/* Protected Healthcare Routes */}
          <Route path="/healthcare" element={
            <ProtectedRoute allowedRoles={['HealthcareWorker']}>
              <HealthcareDashboard />
            </ProtectedRoute>
          } />
          
          {/* Catch-all redirects to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
    </GoogleOAuthProvider>
  );
}