const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicationName: { type: String, required: true },
  timeOfDay: { type: String, required: true }, // e.g., "Morning", "Afternoon", "Evening"
  instructions: { type: String }, // e.g., "With food", "With a full glass of water"
  isTaken: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Medication', medicationSchema);