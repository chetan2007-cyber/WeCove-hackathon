const mongoose = require('mongoose');

const relationshipSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { 
    type: String, 
    enum: ['CAREGIVER', 'HEALTHCARE_WORKER', 'FAMILY_MEMBER'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'AUTHORIZED', 'REVOKED'], 
    default: 'AUTHORIZED' 
  },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Relationship', relationshipSchema);