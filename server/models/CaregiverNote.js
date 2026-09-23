const mongoose = require('mongoose');

const caregiverNoteSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  createdBy: { type: String, default: 'Caregiver' }
}, { timestamps: true }); // Automatically handles the 'createdAt' field from Part G

module.exports = mongoose.model('CaregiverNote', caregiverNoteSchema);