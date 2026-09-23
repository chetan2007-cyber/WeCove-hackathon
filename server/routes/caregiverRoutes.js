const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiverController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Using standard REST paths from blueprint with role protection
router.get('/:id/patients', verifyToken, requireRole(['Caregiver', 'HealthcareWorker', 'Admin']), caregiverController.getAuthorizedPatients);
router.get('/patients/:id/dashboard-summary', verifyToken, caregiverController.getPatientSummary);

module.exports = router;