const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

router.post('/', reminderController.createReminder);
router.patch('/:id/status', reminderController.updateReminderStatus);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;