const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const smsService = require('../services/smsService');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

// Set up email transporter
const createMailTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const transporter = createMailTransporter();

const generateToken = (id, role = 'Patient') => 
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+91')) return cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
};

// 1. Send Phone OTP
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone, role = 'Patient' } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanPhone = normalizePhone(phone);
    if (!/^\+91[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid Indian mobile number. Expected 10 digits (+91[6-9]XXXXXXXXX)' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      user = await User.create({
        name: `User ${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        email: `${cleanPhone.replace('+', '')}@smriti.care`,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        role: role || 'Patient',
        otp,
        otpExpiresAt,
        isVerified: false
      });
    } else {
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      if (role && user.role !== role) {
        user.role = role;
      }
      await user.save();
    }

    // Real SMS dispatch attempt
    const dispatch = await smsService.sendOtp(cleanPhone, otp);

    return res.status(200).json({
      success: true,
      message: dispatch.delivered 
        ? `Verification code dispatched to ${cleanPhone}` 
        : `Verification code generated. (SMS Gateway not configured: set TWILIO_* or FAST2SMS_API_KEY in server/.env for telecom delivery)`,
      phone: cleanPhone,
      smsDelivered: dispatch.delivered,
      provider: dispatch.provider,
      devOtp: !dispatch.delivered ? otp : undefined
    });
  } catch (error) {
    console.error('[Auth] Send Phone OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
  }
};

// 2. Verify Phone OTP
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, otp, role, name } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and 6-digit OTP code are required.' });
    }

    const cleanPhone = normalizePhone(phone);
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found for this phone number. Please register first.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    if (role && user.role !== role) {
      user.role = role;
    }
    if (name && (!user.name || user.name.startsWith('User '))) {
      user.name = name.trim();
    }

    user.isVerified = true;
    user.otp = '';
    await user.save();

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Phone verified successfully.',
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: true,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('[Auth] Verify Phone OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

// 3. Send Email OTP
exports.sendEmailOtp = async (req, res) => {
  try {
    const { email, role = 'Patient' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address (e.g., name@domain.com).' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        role: role || 'Patient',
        otp,
        otpExpiresAt,
        isVerified: false
      });
    } else {
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      if (role && user.role !== role) {
        user.role = role;
      }
      await user.save();
    }

    let emailDelivered = false;
    let provider = 'none';

    // Dispatch real email if SMTP / EMAIL credentials configured
    if ((process.env.EMAIL_USER && process.env.EMAIL_PASS) || process.env.SMTP_HOST) {
      try {
        await transporter.sendMail({
          from: `"Smriti AI Memory Care" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@smriti.care'}>`,
          to: cleanEmail,
          subject: 'Your Smriti Verification Code',
          text: `Your Smriti AI Memory Care verification code is: ${otp}. Valid for 10 minutes.`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; padding: 24px; border: 1px solid #DCE5E3; border-radius: 16px;">
              <h2 style="color: #0F7673; margin-top: 0;">Smriti AI Memory Care</h2>
              <p style="font-size: 16px; color: #222B32;">Here is your verification code to access your care space:</p>
              <div style="background-color: #E5F0EE; padding: 18px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #0F7673; margin: 24px 0;">
                ${otp}
              </div>
              <p style="font-size: 13px; color: #647980;">This code is valid for 10 minutes. If you did not request this code, you can safely ignore this email.</p>
            </div>
          `
        });
        emailDelivered = true;
        provider = 'nodemailer';
        console.log(`[AUTH] ✉️ Dispatched email OTP to ${cleanEmail}`);
      } catch (mailErr) {
        console.warn(`[AUTH] ⚠️ Email dispatch failed:`, mailErr.message);
      }
    } else {
      console.warn(`[AUTH] ⚠️ No SMTP/Email credentials configured. Code for ${cleanEmail}: ${otp}`);
    }

    return res.status(200).json({
      success: true,
      message: emailDelivered 
        ? `Verification code dispatched to ${cleanEmail}` 
        : `Verification code generated. (SMTP configuration required in server/.env for production inbox delivery)`,
      email: cleanEmail,
      emailDelivered,
      provider,
      devOtp: !emailDelivered ? otp : undefined
    });
  } catch (error) {
    console.error('[Auth] Send Email OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email verification code', error: error.message });
  }
};

// 4. Verify Email OTP
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp, role, name } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found for this email address. Please register first.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    if (role && user.role !== role) {
      user.role = role;
    }
    if (name) {
      user.name = name.trim();
    }

    user.isVerified = true;
    user.otp = '';
    await user.save();

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: true,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('[Auth] Verify Email OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

// 5. GET /api/auth/me (Validates session and returns current profile)
exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    return res.status(200).json({
      success: true,
      user: {
        _id: req.user._id || req.user.id,
        id: req.user._id || req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role || req.userRole,
        isVerified: req.user.isVerified !== false,
        preferences: req.user.preferences
      }
    });
  } catch (error) {
    console.error('[Auth] getMe Error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving profile' });
  }
};

// 6. Register User (Backward compatibility)
exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    if (phone) {
      return exports.sendPhoneOtp(req, res);
    }
    if (email) {
      return exports.sendEmailOtp(req, res);
    }
    return res.status(400).json({ success: false, message: 'Phone number or email address is required.' });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// 7. Login User (Backward compatibility)
exports.loginUser = async (req, res) => {
  const { email, phone } = req.body;
  if (phone) return exports.sendPhoneOtp(req, res);
  if (email) return exports.sendEmailOtp(req, res);
  return res.status(400).json({ success: false, message: 'Phone or email is required.' });
};

// 8. Verify OTP (General router fallback)
exports.verifyOTP = async (req, res) => {
  const { email, phone } = req.body;
  if (phone) return exports.verifyPhoneOtp(req, res);
  if (email) return exports.verifyEmailOtp(req, res);
  return res.status(400).json({ success: false, message: 'Phone or email identifier is required.' });
};

// 9. Google OAuth Callback / Exchange
exports.googleAuth = async (req, res) => {
  try {
    const { email, name, role = 'Patient' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google authentication requires email' });
    }
    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        role: role || 'Patient',
        isVerified: true
      });
    }
    const token = generateToken(user._id, user.role);
    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: true,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('[Auth] Google Auth Error:', error);
    return res.status(500).json({ success: false, message: 'Google authentication failed', error: error.message });
  }
};