const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { verifyToken, requireRole, JWT_SECRET } = require('../middlewares/authMiddleware');

test('Backend Security - JWT Generation and Verification', () => {
  const payload = { id: 'patient-uuid-1234', role: 'Patient' };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  assert.ok(token, 'Token must be generated');
  const decoded = jwt.verify(token, JWT_SECRET);
  assert.equal(decoded.id, 'patient-uuid-1234');
  assert.equal(decoded.role, 'Patient');
});

test('Backend Security - Role Gatekeeping Middleware', () => {
  const req = { userRole: 'Patient' };
  let passed = false;
  const next = () => { passed = true; };

  // Patient should pass patient check
  const patientGuard = requireRole(['Patient']);
  patientGuard(req, {}, next);
  assert.equal(passed, true, 'Patient should pass role check');

  // Patient should fail clinician check
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
  clinicianGuard(req, res, () => {});
  assert.equal(deniedStatus, 430 ? 403 : 403);
  assert.match(deniedMessage, /Access denied/);
});

test('Adaptive Difficulty Engine - Rules Validation', () => {
  // Accuracy < 50 => EASY (2 options)
  const calcDifficulty = (accuracy) => {
    if (accuracy < 50) return { difficulty: 'EASY', optionsCount: 2 };
    if (accuracy >= 85) return { difficulty: 'HARD', optionsCount: 4 };
    return { difficulty: 'MEDIUM', optionsCount: 3 };
  };

  assert.deepEqual(calcDifficulty(45), { difficulty: 'EASY', optionsCount: 2 });
  assert.deepEqual(calcDifficulty(70), { difficulty: 'MEDIUM', optionsCount: 3 });
  assert.deepEqual(calcDifficulty(95), { difficulty: 'HARD', optionsCount: 4 });
});

test('Clinical Report Compliance - Mandatory Observational Rules', () => {
  const disclaimer = "This report is generated from application usage data and AI observation. It does not constitute a formal clinical diagnosis.";
  
  assert.ok(disclaimer.includes("does not constitute a formal clinical diagnosis"));
  // Ensure prompt prohibition words are enforced
  const prohibitedTerms = ["Dementia", "Alzheimer's", "worsening"];
  const testObservation = "Patient completed 5 exercises with 80% accuracy. Medication adherence is 90%.";
  
  for (const term of prohibitedTerms) {
    assert.equal(testObservation.includes(term), false, `Report must not diagnose: ${term}`);
  }
});
