const rateLimit = require('express-rate-limit');

/**
 * Standard API Rate Limiter
 * 300 requests per 15-minute window per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});

/**
 * Strict Auth Limiter (Prevents brute force on OTP / Password attempts)
 * 20 attempts per 15-minute window per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
  }
});

/**
 * AI Companion & Generative Model Limiter
 * 40 requests per minute per IP to protect Gemini quota
 */
const companionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Companion rate limit exceeded. Please wait a moment before speaking again.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  companionLimiter
};
