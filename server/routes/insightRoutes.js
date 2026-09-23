const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');

router.get('/:patientId', insightController.generateInsight);

module.exports = router;