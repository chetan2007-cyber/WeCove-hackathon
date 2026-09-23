const express = require('express');
const router = express.Router();
const myDayController = require('../controllers/myDayController');

router.get('/:patientId', myDayController.getDailyOrientation);

module.exports = router;