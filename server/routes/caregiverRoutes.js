const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiverController');

// Using standard REST paths from your blueprint
router.get('/:id/patients', caregiverController.getAuthorizedPatients);
router.get('/patients/:id/dashboard-summary', caregiverController.getPatientSummary);

module.exports = router;