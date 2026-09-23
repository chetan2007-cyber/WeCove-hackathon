const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Existing routes (like saving results) stay here...
// router.post('/result', gameController.saveResult);

// Add the new Personalization Engine route:
router.get('/daily/:patientId', gameController.generateDailyActivity);
router.post('/result', gameController.saveResult);

module.exports = router;