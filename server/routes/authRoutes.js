const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  googleAuth, 
  verifyOTP, 
  sendPhoneOtp, 
  verifyPhoneOtp,
  sendEmailOtp,
  verifyEmailOtp,
  getMe
} = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimiter');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rate-limited phone OTP endpoints
router.post('/send-otp', authLimiter, sendPhoneOtp);
router.post('/send-phone-otp', authLimiter, sendPhoneOtp);
router.post('/verify-phone-otp', authLimiter, verifyPhoneOtp);

// Rate-limited email OTP endpoints
router.post('/send-email-otp', authLimiter, sendEmailOtp);
router.post('/verify-email-otp', authLimiter, verifyEmailOtp);

// Session verification
router.get('/me', verifyToken, getMe);

// Standard auth endpoints
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/google', googleAuth);
router.post('/verify-otp', authLimiter, verifyOTP);

module.exports = router;