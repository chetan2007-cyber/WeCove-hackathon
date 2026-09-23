const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, sparse: true, trim: true },
  phone: { type: String, sparse: true, trim: true, index: true },
  password: { type: String, default: 'otp-authenticated' },
  role: {
    type: String,
    enum: ['Patient', 'Caregiver', 'HealthcareWorker', 'Admin'],
    required: true
  },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiresAt: { type: Date },
  preferences: {
    comfortMode: { type: Boolean, default: false },
    largeText: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);