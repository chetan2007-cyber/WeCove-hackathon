const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  googleAuth, 
  verifyOTP, 
  sendPhoneOtp, 
  verifyPhoneOtp 
} = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimiter');

// Rate-limited phone OTP endpoints
router.post('/send-otp', authLimiter, sendPhoneOtp);
router.post('/verify-phone-otp', authLimiter, verifyPhoneOtp);

// Standard auth endpoints
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/google', googleAuth);
router.post('/verify-otp', authLimiter, verifyOTP);

module.exports = router;