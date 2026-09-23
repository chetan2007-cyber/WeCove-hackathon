# Smriti AI Memory Care — Bugs Fixed Register & Root Cause Analysis

This document tracks all confirmed bugs, vulnerabilities, missing integrations, and architectural defects identified, analyzed, repaired, and verified across the codebase.

---

### BUG ID: AUTH-001
- **Severity**: CRITICAL
- **Problem**: Direct URL Access Bypass — Navigating manually to `/patient`, `/caregiver`, `/healthcare` allowed entry without completing OTP verification or possessing an authenticated session.
- **Root Cause**:
  1. `client/src/pages/Login.js` featured an insecure bypass (`handleQuickDemo`) that wrote hardcoded mock tokens into `localStorage`.
  2. `ProtectedRoute.js` only checked shallow presence of `localStorage.getItem('token')` without checking verified user state (`isVerified: true`, non-empty IDs) and lacked asynchronous backend session validation against `/api/auth/me`.
  3. Backend endpoints did not enforce token authentication or patient ownership checks.
- **Files Changed**:
  - `client/src/pages/Login.js`
  - `client/src/components/ProtectedRoute.js`
  - `client/src/services/authService.js`
  - `server/middlewares/authMiddleware.js`
  - `server/server.js`
- **Fix**:
  - Removed all demo auto-login bypasses.
  - Upgraded `ProtectedRoute.js` to strictly reject any access where `!user || !token || !sessionValid`, perform normalized role gating, and run `authService.verifySession()` calling `/api/auth/me`.
  - Added token and role enforcement to backend endpoints.
- **Test**:
  - `client/src/__tests__/userFlows.test.js` ("1. Security Test: Direct Protected Route Access Without Authentication Redirects to Login")
  - `server/tests/server.test.js` ("2. Backend Security - Reject Missing, Malformed, or Forged Tokens")
- **Status**: PASS

---

### BUG ID: AUTH-002
- **Severity**: CRITICAL
- **Problem**: OTP Was Not Arriving — Users saw "Enter the 6-digit code sent to +91 XXXXX XXXXX" but no SMS was delivered to mobile devices.
- **Root Cause**: The backend generated an OTP in memory, logged it to console, and responded with `success: true` without integrating an SMS telephony gateway.
- **Files Changed**:
  - `server/services/smsService.js` (NEW)
  - `server/controllers/authController.js`
  - `server/routes/authRoutes.js`
  - `client/src/pages/Verify.js`
  - `client/src/services/authService.js`
- **Fix**:
  - Built production SMS telephony service supporting Twilio and Fast2SMS.
  - Implemented honest delivery reporting: if telephony credentials (`TWILIO_*` or `FAST2SMS_API_KEY`) are missing, the API accurately reports `smsDelivered: false` and returns clear instructions rather than faking delivery.
  - Formatted destination mobile number and added resend countdown with real backend retry.
- **Test**:
  - `server/tests/server.test.js` ("5. Phone Number & Email Validation & Normalization")
- **Status**: PASS

---

### BUG ID: AUTH-003
- **Severity**: HIGH
- **Problem**: Missing Email Authentication / Email OTP — Authentication experience was limited to phone only, with no email login or magic code fallback.
- **Root Cause**: Neither backend controllers nor frontend pages implemented email OTP dispatch, validation, or UI tabs.
- **Files Changed**:
  - `server/controllers/authController.js` (`sendEmailOtp`, `verifyEmailOtp`)
  - `server/routes/authRoutes.js` (`/send-email-otp`, `/verify-email-otp`)
  - `client/src/services/authService.js` (`sendEmailOtp`, `verifyEmailOtp`, `isValidEmail`)
  - `client/src/pages/Login.js` (Added Email tab, validation, and error states)
  - `client/src/pages/Register.js` (Added Email registration tab and terms check)
  - `client/src/pages/Verify.js` (Supports verifying email codes with destination display)
  - `supabase/migrations/20260923000001_initial_schema.sql` (Added unique `email` column and contact constraint)
- **Fix**:
  - Integrated `nodemailer` SMTP transporter with Gmail/custom SMTP support.
  - Added full Email OTP request, expiration, verification, and session persistence.
- **Test**:
  - `client/src/__tests__/userFlows.test.js` ("2. Authentication Options: Phone and Email Mode Switching")
  - `client/src/__tests__/userFlows.test.js` ("4. Email Validation Rules")
  - `server/tests/server.test.js` ("5. Phone Number & Email Validation & Normalization")
- **Status**: PASS

---

### BUG ID: API-001
- **Severity**: HIGH
- **Problem**: Reminders 404 — Network requests to `reminders?patientId=...` returned HTTP 404 Not Found.
- **Root Cause**: `server/routes/reminderRoutes.js` mounted sub-paths but lacked a root `router.get('/', ...)` handler, causing Express to fall through to the 404 catch-all.
- **Files Changed**:
  - `server/controllers/reminderController.js` (Implemented `getReminders`, `createReminder`, `updateReminderStatus`, `updateReminder`, `deleteReminder`)
  - `server/routes/reminderRoutes.js` (Mounted root `GET /` and `POST /` with `verifyToken`)
- **Fix**:
  - Implemented `getReminders` controller supporting patient filtering, sorting by time, and patient role isolation.
  - Mounted `router.get('/', ...)` in `reminderRoutes.js`.
- **Test**:
  - `server/tests/server.test.js` ("6. Reminders Validation Rules")
- **Status**: PASS

---

### BUG ID: SEC-001
- **Severity**: CRITICAL
- **Problem**: Unauthenticated Patient List & Clinical Report Access — Sensitive endpoints including `GET /api/patients` and `GET /api/patients/:id/report` were open without authentication.
- **Root Cause**: Routes were declared in `server/server.js` without `verifyToken` or `requireRole` middlewares.
- **Files Changed**:
  - `server/server.js`
  - `server/middlewares/authMiddleware.js`
- **Fix**:
  - Attached `verifyToken` and `requireRole(['Caregiver', 'HealthcareWorker', 'Admin'])` to `/api/patients` and `/api/patients/:id/report`.
  - Added check preventing patients from viewing reports or other patients' records (returns 403).
  - Unauthenticated calls return 401.
- **Test**:
  - `server/tests/server.test.js` ("3. Backend Security - Role Gatekeeping Middleware Matrix")
  - `server/tests/server.test.js` ("4. Patient Isolation & Authorization Matrix")
- **Status**: PASS

---

### BUG ID: SEC-002
- **Severity**: HIGH
- **Problem**: Cross-Patient Data Leakage — Patient A could query memories, cognitive trends, or reminders belonging to Patient B.
- **Root Cause**: Controllers accepted `patientId` from parameters or query strings without validating against `req.userId` for users with role 'Patient'.
- **Files Changed**:
  - `server/controllers/memoryController.js`
  - `server/controllers/patientController.js`
  - `server/controllers/gameController.js`
  - `server/controllers/reminderController.js`
  - `server/server.js`
- **Fix**:
  - Enforced strict condition: `if (req.userRole === 'Patient' && String(req.userId) !== String(targetId)) return res.status(403)`.
  - In `POST /api/games/save` and `POST /api/reminders`, forced `patientId` to `req.userId` for patients.
- **Test**:
  - `server/tests/server.test.js` ("4. Patient Isolation & Authorization Matrix")
- **Status**: PASS

---

### BUG ID: DB-001
- **Severity**: MEDIUM
- **Problem**: Relationship Schema Column Mismatch — `caregiverController.js` queried `caregiver_id` and `patient_id` while `models/Relationship.js` defined `userId` and `patientId`.
- **Root Cause**: Inconsistent field names between MongoDB schema and controller queries caused empty relationship results.
- **Files Changed**:
  - `server/models/Relationship.js`
  - `server/controllers/caregiverController.js`
- **Fix**:
  - Updated `Relationship.js` schema to support both camelCase and snake_case references and added compound indexes.
  - Updated `caregiverController.js` to query with `$or: [{ caregiver_id }, { userId }, { caregiverId }]`.
- **Status**: PASS

---

### BUG ID: BUILD-001
- **Severity**: HIGH
- **Problem**: Production Build Crash via ESLint Home Directory Traversal — `react-scripts build` failed with `Syntax error: Error while parsing JSON - Expected double-quoted property name in JSON at position 399 (line 14 column 1)`.
- **Root Cause**: `client/package.json`'s `eslintConfig` lacked `"root": true`, causing ESLint to traverse outside the workspace into `C:\Users\Chetan Sharma P\package.json`.
- **Files Changed**:
  - `client/package.json`
  - `client/src/components/ProtectedRoute.js` (Removed unused variable)
- **Fix**:
  - Added `"root": true` to `client/package.json`.
  - Cleaned up unused variables.
- **Test**:
  - Executed `npm run build` in `client`: compiled successfully with zero errors and zero warnings.
- **Status**: PASS
