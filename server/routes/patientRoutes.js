const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// Blueprint C.3 Endpoint Mappings
router.get('/:id/day', patientController.getMyDay);
router.patch('/:id/preferences', patientController.updatePreferences);
router.post('/voice/query', patientController.processVoiceQuery);
router.get('/:id/details', patientController.getPatientDetails);

module.exports = router;