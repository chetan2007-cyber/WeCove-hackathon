const express = require('express');
const router = express.Router();
const { addReminder, getPatientReminders } = require('../controllers/medicationController');

router.post('/add', addReminder);
router.get('/:patientId', getPatientReminders);

module.exports = router;