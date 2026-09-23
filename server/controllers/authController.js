const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

// Set up email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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

// 1. Register User (Email + Password, sends OTP)
exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    
    if (email && await User.findOne({ email })) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const cleanPhone = phone ? normalizePhone(phone) : null;
    if (cleanPhone && await User.findOne({ phone: cleanPhone })) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'otp-authenticated', salt);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({ 
      name: name || 'User', 
      email: email || `${cleanPhone || Date.now()}@smriti.care`, 
      phone: cleanPhone,
      password: hashedPassword, 
      role: role || 'Patient', 
      otp,
      otpExpiresAt
    });

    if (email && process.env.EMAIL_USER) {
      try {
        await transporter.sendMail({
          from: 'Smriti AI Memory Care',
          to: email,
          subject: 'Verify your Smriti Account',
          text: `Your Smriti registration OTP is: ${otp}`
        });
      } catch (mailErr) {
        console.warn('[Mail Warning] Failed to send email, proceeding in dev mode:', mailErr.message);
      }
    }

    console.log(`[DEV MODE] OTP for ${cleanPhone || email} is ${otp}`);

    res.status(201).json({ 
      message: 'User created. Please verify OTP.', 
      email: user.email, 
      phone: user.phone,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. Send Phone OTP
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone, role = 'Patient' } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const cleanPhone = normalizePhone(phone);
    if (!/^\+91[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ message: 'Invalid Indian mobile number. Expected +91XXXXXXXXXX' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      // Create user stub
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

    console.log(`[AUTH] 📱 Generated OTP for ${cleanPhone}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${cleanPhone}`,
      phone: cleanPhone,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error('Send Phone OTP Error:', error);
    return res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
};

// 3. Verify Phone OTP
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, otp, role } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const cleanPhone = normalizePhone(phone);
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return res.status(404).json({ message: 'User not found for this phone number' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Role check if requested
    if (role && user.role !== role) {
      user.role = role;
    }

    user.isVerified = true;
    user.otp = '';
    await user.save();

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Verify Phone OTP Error:', error);
    return res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
  }
};

// 4. Google Auth
exports.googleAuth = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    let user = await User.findOne({ email });
    
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const otp = generateOTP();
      
      user = await User.create({
        name, 
        email, 
        password: await bcrypt.hash(randomPassword, salt), 
        role: role || 'Patient', 
        otp,
        isVerified: true
      });

      console.log(`[DEV MODE] Google user registered: ${email}`);
      const token = generateToken(user._id, user.role);
      return res.status(200).json({ 
        _id: user.id, 
        id: user.id,
        name: user.name, 
        email: user.email, 
        role: user.role, 
        token 
      });
    }

    // Strict Role Check for existing Google users logging in
    if (role && user.role !== role) {
      return res.status(403).json({ message: `Access Denied: You are registered as a ${user.role}, not a ${role}.` });
    }

    const token = generateToken(user._id, user.role);
    res.status(200).json({ 
      _id: user.id, 
      id: user.id,
      name: user.name, 
      email: user.email, 
      role: user.role, 
      token 
    });
  } catch (error) {
    res.status(500).json({ message: 'Google auth error', error: error.message });
  }
};

// 5. Verify OTP Endpoint (Email)
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    user.isVerified = true;
    user.otp = '';
    await user.save();

    const token = generateToken(user._id, user.role);
    res.status(200).json({ 
      message: 'Account verified successfully. You can now log in.',
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 6. Strict Role-Based Login (Email + Password)
exports.loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (role && user.role !== role) {
      return res.status(403).json({ message: `Access Denied: You are registered as a ${user.role}, not a ${role}.` });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your OTP before logging in.' });
    }

    if (await bcrypt.compare(password, user.password)) {
      res.status(200).json({ 
        _id: user.id, 
        id: user.id,
        name: user.name, 
        email: user.email, 
        role: user.role, 
        token: generateToken(user._id, user.role) 
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};