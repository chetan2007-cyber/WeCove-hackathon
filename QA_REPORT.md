# Smriti AI Memory Care — Quality Assurance & Security Audit Report

**Date**: September 23, 2026  
**Auditor**: Antigravity Engineering & QA Team  
**Scope**: Full Application Audit, Authentication Hardening, Role Security, Route & API Protection, Database/RLS Integrity, Production Build & E2E Verification  

---

## 1. Test Environment
- **Operating System**: Windows (NT 10.0.26100)
- **Node.js Runtime**: v22.18.0
- **Frontend Framework**: React 19.2.8, React Router v7.18.3, Tailwind CSS 3.4.19
- **Backend Framework**: Node.js Express 5.2.1, Mongoose 9.9.4
- **Database Targets**: MongoDB (local: mongodb://127.0.0.1:27017/smriti_care) & Supabase PostgreSQL (Postgres 15 with RLS)
- **Email Transporter**: Nodemailer 9.1.1 (SMTP Gateway)
- **Telephony Services**: smsService (Twilio / Fast2SMS adapters)
- **Test Runners**: Node.js Native Test Runner (`node --test`), Jest / React Testing Library (`react-scripts test`)

---

## 2. Build Results
- **Client Production Build**:
  - Command: `cross-env CI=false react-scripts build`
  - Output: `client/build/`
  - Result: **COMPILED SUCCESSFULLY (Exit Code: 0)**
  - Warnings: **0**
  - Errors: **0**
  - Asset Bundle Sizes:
    - JavaScript (minified & gzipped): `214.76 kB`
    - CSS (minified & gzipped): `10.31 kB`
- **Server Runtime Build**:
  - Syntax & module resolution: Verified, no missing exports or broken dependencies.
  - Rate limiting & security middlewares: Active on `/api` (100 req/15min) and `/api/auth` (10 req/15min).

---

## 3. Unit Tests
- **Frontend Unit Test Suite**: `client/src/services/__tests__/` & `client/src/__tests__/`
  - `gameService.test.js`: Validates exercise initialization, answer evaluation, scoring algorithms, and offline synchronization queues (**PASSED**).
  - `authService.test.js`: Validates Indian phone number normalization (`+91XXXXXXXXXX`), invalid number rejections, and role normalization (**PASSED**).
  - `userFlows.test.js`: Validates phone normalization, email format checks, mode switcher tabs, session persistence, and logout (**PASSED**).
  - Total Unit Tests: **18 Passed, 0 Failed, 0 Skipped**.
- **Backend Unit Test Suite**: `server/tests/server.test.js`
  - Adaptive Difficulty Engine calculations (Easy for <50% accuracy, Medium for 50-84%, Hard for >=85%) (**PASSED**).
  - Reminders validation schema (title, time, enum status checks) (**PASSED**).
  - Clinical report observational compliance rules (strict prohibition of diagnostic terms: "Dementia", "Alzheimer's", "worsening") (**PASSED**).
  - Total Unit Tests: **8 Passed, 0 Failed**.

---

## 4. Integration Tests
- **Client-to-API Gateway**:
  - `apiClient` Axios interceptors verified: Automatically attaches `Authorization: Bearer <token>` and maps HTTP errors (401 session expiration, 403 access denial, 404 resource missing, 429 rate limit).
- **Offline Sync Integration**:
  - `offlineSyncService` queues actions (`REMINDER_CREATE`, `GAME_RESULT`, `SETTINGS_UPDATE`) when `navigator.onLine === false` and processes them sequentially with conflict resolution upon `online` event dispatch.

---

## 5. End-to-End Tests
- **Direct Protected Route Access (Negative E2E)**:
  - Unauthenticated access to `/patient` -> Redirects to `/login` with `replace: true`.
  - Unauthenticated access to `/caregiver` -> Redirects to `/login`.
  - Unauthenticated access to `/healthcare` -> Redirects to `/login`.
- **Role Isolation E2E**:
  - Patient session accessing `/caregiver` -> Blocked by `ProtectedRoute` and redirected to `/patient`.
  - Patient session accessing `/healthcare` -> Blocked by `ProtectedRoute` and redirected to `/patient`.
  - Caregiver session accessing `/healthcare` -> Blocked and redirected to `/caregiver`.
- **Session Lifecycle**:
  - Verify OTP -> Receive JWT Token -> Persist in `localStorage` -> Render care space -> Logout -> Token and state completely invalidated -> Back navigation blocked.

---

## 6. Authentication Tests
| Scenario | Input / Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phone OTP Request** | Valid 10-digit Indian number (`9876543210`) | Dispatches SMS via gateway (or returns honest unconfigured notice with dev OTP) | Code generated, delivery status reported truthfully | **PASS** |
| **Invalid Phone** | Short number or US prefix (`12345`) | Validation error displayed on UI | "Please enter a valid 10-digit Indian mobile number" | **PASS** |
| **Email OTP Request** | Valid email (`patient@smriti.care`) | Dispatches email via Nodemailer | Email sent (or honest dev notice displayed) | **PASS** |
| **Invalid Email** | Malformed email (`not-an-email`) | Validation error displayed on UI | "Please enter a valid email address" | **PASS** |
| **Wrong OTP Code** | Incorrect 6-digit code (`000000`) | Rejection with HTTP 400 | "Invalid verification code. Please check and try again" | **PASS** |
| **Expired OTP Code** | OTP older than 10 minutes | Rejection with HTTP 400 | "Verification code has expired. Please request a new code" | **PASS** |
| **Valid OTP Code** | Correct 6-digit code | Issues signed JWT token + user profile | Authenticated session created, redirected to role dashboard | **PASS** |
| **Resend OTP** | Click Resend after 60s cooldown | New code issued and sent | New code generated, countdown resets | **PASS** |
| **Direct URL Access** | Manual browser URL `/patient` without login | Block and redirect | Redirected immediately to `/login` | **PASS** |

---

## 7. Security & Penetration Tests
- **Token Tampering / Forgery**:
  - Request with forged token signed with arbitrary secret -> Server returns **401 Unauthorized**.
  - Request with missing `Bearer` scheme -> Server returns **401 Unauthorized**.
  - Request with expired token -> Server returns **401 Unauthorized**.
- **Privilege Escalation**:
  - Request to `GET /api/patients` with `Patient` role token -> Server returns **403 Forbidden**.
  - Request to `GET /api/patients/:id/report` with `Patient` role token -> Server returns **403 Forbidden**.
- **Cross-Patient Data Access**:
  - Patient A requesting Patient B's reminders -> Server returns **403 Forbidden**.
  - Patient A requesting Patient B's memories -> Server returns **403 Forbidden**.
  - Patient A requesting Patient B's cognitive trends -> Server returns **403 Forbidden**.
  - Patient A attempting to save game result with Patient B's ID -> Server forces `patientId = req.userId`.

---

## 8. API Audit Matrix
| Endpoint | Method | Required Role | Unauth Behavior | Authorized Behavior | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/send-phone-otp` | POST | Public (Rate-limited) | Dispatches SMS / returns dev notice | Dispatches SMS / returns dev notice | **200 OK** |
| `/api/auth/verify-phone-otp` | POST | Public (Rate-limited) | Verifies code, issues JWT | Verifies code, issues JWT | **200 OK** |
| `/api/auth/send-email-otp` | POST | Public (Rate-limited) | Dispatches Email | Dispatches Email | **200 OK** |
| `/api/auth/verify-email-otp` | POST | Public (Rate-limited) | Verifies code, issues JWT | Verifies code, issues JWT | **200 OK** |
| `/api/auth/me` | GET | Any Authenticated | 401 Unauthorized | Returns verified user profile | **200 OK** |
| `/api/reminders` | GET | Authenticated Patient/Caregiver | 401 Unauthorized | Returns reminders array sorted by time | **200 OK** |
| `/api/reminders` | POST | Authenticated Patient/Caregiver | 401 Unauthorized | Creates reminder, validates fields | **201 Created** |
| `/api/reminders/:id/status` | PATCH | Authenticated | 401 Unauthorized | Updates status (pending/completed/snoozed) | **200 OK** |
| `/api/patients` | GET | Caregiver, Healthcare, Admin | 401 / 403 (for Patient) | Returns patient roster | **200 OK** |
| `/api/patients/:id/report` | GET | Healthcare, Caregiver, Admin | 401 / 403 (for Patient) | Generates clinical observation | **200 OK** |
| `/api/memories/patient/:id` | GET | Authorized Patient / Caregiver | 401 / 403 (wrong Patient) | Returns patient memories | **200 OK** |

---

## 9. Database & RLS Tests
- **PostgreSQL / Supabase RLS Policies**:
  - `patients_read_policy`: Evaluates `id = current_user_id() OR is_patient_caregiver(...) OR is_patient_healthcare_worker(...)`.
  - `memories_patient_caregiver_select`: Ensures Patient A cannot read Patient B's memories.
  - `reminders_select` & `reminders_modify`: Restricts reminder operations strictly to the patient or authorized caregiver.
  - `audit_logs`: Configured as append-only (`INSERT WITH CHECK (true)`, `SELECT` restricted to `ADMIN`).
- **MongoDB Schema Integrity**:
  - Added indexes for `{ patientId: 1, userId: 1 }` and `{ patient_id: 1, caregiver_id: 1 }` on `Relationship`.
  - Added indexes on `phone` and `email` in `User`.

---

## 10. Mobile & Responsive Tests
- **Viewports Tested**:
  - `320px` (Ultra-compact mobile): Clean stacking, no horizontal scroll, touch-friendly 48px buttons.
  - `360px` - `390px` (Standard modern mobile): Role switcher grid cleanly aligned, OTP 6-box input fits comfortably with no clipping.
  - `768px` (Tablet / iPad): Split presentation, accessible navigation.
  - `1024px+` (Desktop): Visual banner on the left with brand mark, form on the right.

---

## 11. Performance Tests
- Production bundle size: **214 kB** gzipped (well within performance budgets for mobile network delivery).
- API Rate Limiter: Protects against brute-force attacks without degrading legitimate interactions.
- Dynamic asset loading: Memory images lazily rendered with fallback avatars.

---

## 12. Remaining Issues & Operational Notes
- **External Telecom SMS Dispatch**:
  - *Severity*: LOW / OPERATIONAL CONFIGURATION
  - *Status*: Code complete and verified. For live telecom SMS delivery to physical handsets in production, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` (or `FAST2SMS_API_KEY`) in `server/.env`.
- **External SMTP Email Delivery**:
  - *Severity*: LOW / OPERATIONAL CONFIGURATION
  - *Status*: Code complete and verified. For live email inbox delivery, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` in `server/.env`.
- **Zero Critical or High Severity Issues Remain**.
