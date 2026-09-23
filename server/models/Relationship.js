const mongoose = require('mongoose');

const relationshipSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.Mixed, required: true },
  patient_id: { type: mongoose.Schema.Types.Mixed },
  userId: { type: mongoose.Schema.Types.Mixed },
  caregiver_id: { type: mongoose.Schema.Types.Mixed },
  caregiverId: { type: mongoose.Schema.Types.Mixed },
  role: { 
    type: String, 
    enum: ['CAREGIVER', 'HEALTHCARE_WORKER', 'FAMILY_MEMBER', 'Caregiver', 'HealthcareWorker', 'Patient'], 
    default: 'CAREGIVER' 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'AUTHORIZED', 'REVOKED'], 
    default: 'AUTHORIZED' 
  },
  grantedBy: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Ensure indices for rapid authorization lookups
relationshipSchema.index({ patientId: 1, userId: 1 });
relationshipSchema.index({ patient_id: 1, caregiver_id: 1 });

module.exports = mongoose.model('Relationship', relationshipSchema);