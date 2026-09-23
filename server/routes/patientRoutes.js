const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Protected Patient Routes
router.get('/:id/day', verifyToken, patientController.getMyDay);
router.patch('/:id/preferences', verifyToken, patientController.updatePreferences);
router.post('/voice/query', verifyToken, patientController.processVoiceQuery);
router.get('/:id/details', verifyToken, patientController.getPatientDetails);

module.exports = router;