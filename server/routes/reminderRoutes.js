const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Reminder endpoints (Protected with optional auth for graceful fallback)
router.get('/', (req, res, next) => {
  // If authorization header provided, verify token; otherwise allow query parameter lookup
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
}, reminderController.getReminders);

router.post('/', (req, res, next) => {
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
}, reminderController.createReminder);

router.patch('/:id/status', reminderController.updateReminderStatus);
router.put('/:id', reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;