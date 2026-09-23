const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Protected game personalization and result tracking
router.get('/daily/:patientId', verifyToken, gameController.generateDailyActivity);
router.post('/result', verifyToken, gameController.saveResult);

module.exports = router;