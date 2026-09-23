# Smriti AI Memory Care — System Stabilization & Debug Report

## Fixed

1. **Git Merge Conflicts Injected in 30 Files**:
   - The repository was locked in an unresolved merge state with raw git conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`) injected across core files (`server.js`, `authController.js`, `User.js`, `package.json`, `Login.js`, `PatientHome.js`, etc.).
   - Aborted the conflicted merge cleanly, preserved the modernized architecture on a safe branch (`debug/stability-fix`), and integrated legitimate changes (modal memory delete and detail inspection) without conflict markers.

2. **Backend BSON Casting Crash on UUID Identifiers**:
   - `GameResult`, `CognitiveMetric`, and `Reminder` schemas strictly enforced `mongoose.Schema.Types.ObjectId` on `patientId`. When querying or recording records for UUID-based patients (`11111111-1111-1111-1111-111111111111`), BSON threw fatal casting errors (`BSONError: input must be a 24 character hex string`).
   - Upgraded all schemas to accept indexed String identifiers, allowing native interoperability between MongoDB ObjectIds and Supabase UUIDs.

3. **Invalid Google Gemini Model Identifiers**:
   - Multiple backend controllers (`patientController.js`, `memoryController.js`, `insightController.js`, `server.js`) referenced nonexistent model name `"gemini-3.5-flash"`.
   - Updated all occurrences to `process.env.GEMINI_MODEL || "gemini-1.5-flash"`.

4. **Server Startup Architecture & Missing Rate Limiting**:
   - `server.js` was invoking `app.listen()` midway through the file before declaring routes, lacked rate limiting, had no centralized error handler, and crashed if MongoDB was unreachable.
   - Restructured into a production-grade pipeline: CORS, express body parsers, global API rate limiter (300 req / 15 min), strict auth limiter (20 attempts / 15 min), AI companion limiter (40 req / min), `/api/health` and `/api/status` endpoints, graceful MongoDB connection recovery, and unified error middleware.

5. **Client Build Failures & Linter Warnings**:
   - Missing `alt` attributes on hero images (`jsx-a11y/alt-text`).
   - Unused Lucide icon imports across `shared.js`, `PatientMyDay.js`, `CaregiverDashboard.js`, `HealthcareDashboard.js`, `PatientMemories.js`, and `CaregiverSchedule.js`.
   - Unhandled camera capture and image preview modal steps in `PatientHome.js`.
   - Missing `useEffect` hook dependencies in `PatientMyDay.js` resolved using `useCallback`.
   - Production bundle now compiles with **0 warnings and 0 errors** (`Compiled successfully!`).

6. **Test Suite & Jest Resolver Fixes**:
   - CRA Jest 27 failed to resolve `react-router/dom` from `react-router-dom` v7. Configured Jest `moduleNameMapper` and added `TextEncoder`/`TextDecoder` polyfills in `setupTests.js`.
   - Added unit test suites for `authService` (+91 phone normalization, session storage), `gameService` (adaptive cognitive engine), and full end-to-end user flows (`userFlows.test.js`).
   - Created Node test suite in `server/tests/server.test.js` validating JWT creation, role gatekeeping, adaptive difficulty, and observational compliance.

---

## Remaining

- **Browser Playwright CDN Driver**:
  - The local headless Playwright runner failed during subagent startup due to a 404 on AzureEdge CDN for Windows binary `1.57.0`. Automated flow testing was executed via Jest end-to-end simulation and direct HTTP API tests.

---

## Environment

### Root / Client (`client/.env`)
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SUPABASE_URL=https://your-supabase-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Server (`server/.env`)
```bash
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/miri-db
JWT_SECRET=your-secure-jwt-secret-min-32-chars
GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash
```

---

## Database

### Supabase Migrations (`supabase/migrations/`)
- `20260923000001_initial_schema.sql`: Complete PostgreSQL schema with Row Level Security (RLS) policies isolating Patients, Caregivers, and Healthcare Workers.
- `seed.sql`: Deterministic seed fixtures for Patient, Caregiver, and Healthcare Worker test personas.

### MongoDB Collections (`server/models/`)
- `users`: User profiles with phone number, role, verification status, and accessibility preferences.
- `gameresults`: Historical game session telemetry with response times and accuracy.
- `cognitivemetrics`: Running 7-session cognitive performance trends.
- `reminders`: Time-stamped medication, routine, and appointment notifications.
- `memoryitems`: Media album with AI contextual tags.

---

## Authentication

1. **Phone Number Input**: Accepts Indian 10-digit mobile numbers with or without `+91` prefix; normalizes to E.164 (`+91XXXXXXXXXX`).
2. **OTP Dispatch**: Generates a 6-digit cryptographic code with a 10-minute expiration window. Dispatches via SMS provider or logs `[DEV MODE] OTP` in development.
3. **Verification & Token Issuance**: Verifies code, marks account verified, and issues a signed JWT containing user ID and assigned role.
4. **Role Gatekeeping**: Client `ProtectedRoute` and server `requireRole(['Patient' | 'Caregiver' | 'HealthcareWorker'])` enforce strict access boundaries.

---

## Known Limitations

1. **SMS Gateway Credentials**: In local development without live Twilio or Fast2SMS API keys, the server operates in Dev Mode, outputting OTPs to console/dev response.
2. **External Voice Synthesis**: Voice read-aloud uses the browser's native `window.speechSynthesis` (Web Speech API). In headless/server environments without audio hardware, synthesis gracefully falls back to visual subtitles.
3. **Observational AI Reports**: AI narrative summaries enforce strict clinical observational boundaries and will deliberately refuse to issue diagnoses (e.g. Dementia/Alzheimer's) in compliance with healthcare data regulations.
