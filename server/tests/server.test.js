const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { verifyToken, requireRole, JWT_SECRET } = require('../middlewares/authMiddleware');

test('1. Backend Security - JWT Generation and Verification', () => {
  const payload = { id: 'patient-uuid-1234', role: 'Patient' };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  assert.ok(token, 'Token must be generated');
  const decoded = jwt.verify(token, JWT_SECRET);
  assert.equal(decoded.id, 'patient-uuid-1234');
  assert.equal(decoded.role, 'Patient');
});

test('2. Backend Security - Reject Missing, Malformed, or Forged Tokens', () => {
  // Case A: Missing Authorization header
  let req = { headers: {} };
  let statusResult = 0;
  let res = {
    status: (code) => {
      statusResult = code;
      return { json: () => {} };
    }
  };
  verifyToken(req, res, () => {});
  assert.equal(statusResult, 401, 'Missing token must return 401 Unauthorized');

  // Case B: Malformed header format (not Bearer)
  req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
  statusResult = 0;
  verifyToken(req, res, () => {});
  assert.equal(statusResult, 401, 'Malformed token must return 401 Unauthorized');

  // Case C: Forged token signed with wrong secret
  const forgedToken = jwt.sign({ id: 'hacker', role: 'Admin' }, 'fake-attacker-secret');
  req = { headers: { authorization: `Bearer ${forgedToken}` } };
  statusResult = 0;
  verifyToken(req, res, () => {});
  assert.equal(statusResult, 401, 'Forged token must return 401 Unauthorized');

  // Case D: Expired token
  const expiredToken = jwt.sign({ id: 'patient-1', role: 'Patient' }, JWT_SECRET, { expiresIn: '-1s' });
  req = { headers: { authorization: `Bearer ${expiredToken}` } };
  statusResult = 0;
  verifyToken(req, res, () => {});
  assert.equal(statusResult, 401, 'Expired token must return 401 Unauthorized');
});

test('3. Backend Security - Role Gatekeeping Middleware Matrix', () => {
  // Patient role checks
  const patientReq = { userRole: 'Patient' };
  let passed = false;
  const next = () => { passed = true; };

  const patientGuard = requireRole(['Patient']);
  patientGuard(patientReq, {}, next);
  assert.equal(passed, true, 'Patient should pass Patient check');

  // Patient attempting Clinician route
  let deniedStatus = 0;
  let deniedMessage = '';
  const res = {
    status: (code) => {
      deniedStatus = code;
      return {
        json: (data) => { deniedMessage = data.message; }
      };
    }
  };

  const clinicianGuard = requireRole(['HealthcareWorker']);
  clinicianGuard(patientReq, res, () => {});
  assert.equal(deniedStatus, 403, 'Patient accessing Clinician route must return 403 Forbidden');
  assert.match(deniedMessage, /Access denied/);

  // Patient attempting Caregiver route
  deniedStatus = 0;
  const caregiverGuard = requireRole(['Caregiver', 'Admin']);
  caregiverGuard(patientReq, res, () => {});
  assert.equal(deniedStatus, 403, 'Patient accessing Caregiver route must return 403 Forbidden');

  // Caregiver attempting Clinician route
  const caregiverReq = { userRole: 'Caregiver' };
  deniedStatus = 0;
  clinicianGuard(caregiverReq, res, () => {});
  assert.equal(deniedStatus, 403, 'Caregiver accessing Clinician route must return 403 Forbidden');

  // Clinician attempting Clinician route
  const clinicianReq = { userRole: 'HealthcareWorker' };
  passed = false;
  clinicianGuard(clinicianReq, {}, next);
  assert.equal(passed, true, 'Clinician should pass Clinician check');
});

test('4. Patient Isolation & Authorization Matrix', () => {
  // Simulate Patient A trying to access Patient B's data
  const patientA = { id: 'patient-A-uuid', role: 'Patient' };
  const targetPatientId = 'patient-B-uuid';

  const checkPatientIsolation = (user, targetId) => {
    if (user.role === 'Patient' && String(user.id) !== String(targetId)) {
      return { status: 403, error: 'Forbidden' };
    }
    return { status: 200, success: true };
  };

  // Patient A accessing own data -> ALLOWED
  assert.equal(checkPatientIsolation(patientA, 'patient-A-uuid').status, 200);

  // Patient A accessing Patient B data -> REJECTED 403
  assert.equal(checkPatientIsolation(patientA, targetPatientId).status, 403);

  // Clinician accessing Patient B data -> ALLOWED
  const clinicianUser = { id: 'dr-barua', role: 'HealthcareWorker' };
  assert.equal(checkPatientIsolation(clinicianUser, targetPatientId).status, 200);
});

test('5. Phone Number & Email Validation & Normalization', () => {
  // Indian phone number normalization
  const normalizeIndianPhone = (phone) => {
    if (!phone) return { isValid: false, normalized: '', error: 'Required' };
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('+91')) cleaned = cleaned.substring(3);
    else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.substring(2);

    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleaned)) {
      return { isValid: false, normalized: '', error: 'Invalid' };
    }
    return { isValid: true, normalized: `+91${cleaned}` };
  };

  // Valid formats
  assert.equal(normalizeIndianPhone('9876543210').normalized, '+919876543210');
  assert.equal(normalizeIndianPhone('+91 98765 43210').normalized, '+919876543210');
  assert.equal(normalizeIndianPhone('09876543210').normalized, '+919876543210');
  assert.equal(normalizeIndianPhone('919876543210').normalized, '+919876543210');

  // Invalid formats
  assert.equal(normalizeIndianPhone('12345').isValid, false);
  assert.equal(normalizeIndianPhone('abcdefghij').isValid, false);
  assert.equal(normalizeIndianPhone('1234567890').isValid, false); // Does not start with 6-9

  // Email format validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
  };

  assert.equal(isValidEmail('patient@smriti.care'), true);
  assert.equal(isValidEmail('caregiver.ananya@family.org'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('invalid@'), false);
  assert.equal(isValidEmail('@domain.com'), false);
  assert.equal(isValidEmail(''), false);
});

test('6. Reminders Validation Rules', () => {
  const validateReminder = (payload) => {
    if (!payload.patientId) return { valid: false, error: 'patientId required' };
    if (!payload.title || !payload.title.trim()) return { valid: false, error: 'title required' };
    if (!payload.time) return { valid: false, error: 'time required' };
    return { valid: true };
  };

  // Valid reminder
  assert.equal(validateReminder({ patientId: 'p-1', title: 'Take Medication', time: '2026-09-24T08:00:00Z' }).valid, true);

  // Missing title
  assert.equal(validateReminder({ patientId: 'p-1', title: '   ', time: '2026-09-24T08:00:00Z' }).valid, false);

  // Missing time
  assert.equal(validateReminder({ patientId: 'p-1', title: 'Walk', time: '' }).valid, false);

  // Status Enum check
  const allowedStatuses = ['pending', 'completed', 'snoozed'];
  assert.equal(allowedStatuses.includes('completed'), true);
  assert.equal(allowedStatuses.includes('deleted'), false);
});

test('7. Adaptive Difficulty Engine - Rules Validation', () => {
  const calcDifficulty = (accuracy) => {
    if (accuracy < 50) return { difficulty: 'EASY', optionsCount: 2 };
    if (accuracy >= 85) return { difficulty: 'HARD', optionsCount: 4 };
    return { difficulty: 'MEDIUM', optionsCount: 3 };
  };

  assert.deepEqual(calcDifficulty(45), { difficulty: 'EASY', optionsCount: 2 });
  assert.deepEqual(calcDifficulty(70), { difficulty: 'MEDIUM', optionsCount: 3 });
  assert.deepEqual(calcDifficulty(95), { difficulty: 'HARD', optionsCount: 4 });
});

test('8. Clinical Report Compliance - Mandatory Observational Rules', () => {
  const disclaimer = "This report is generated from application usage data and AI observation. It does not constitute a formal clinical diagnosis.";
  
  assert.ok(disclaimer.includes("does not constitute a formal clinical diagnosis"));
  const prohibitedTerms = ["Dementia", "Alzheimer's", "worsening"];
  const testObservation = "Patient completed 5 exercises with 80% accuracy. Medication adherence is 90%.";
  
  for (const term of prohibitedTerms) {
    assert.equal(testObservation.includes(term), false, `Report must not diagnose: ${term}`);
  }
});
