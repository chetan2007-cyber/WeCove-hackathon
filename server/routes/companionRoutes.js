const express = require('express');
const router = express.Router();
const companionController = require('../controllers/companionController');

router.post('/process', companionController.processVoiceIntent);

module.exports = router;