const mongoose = require('mongoose');

const cognitiveMetricSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameName: { type: String, required: true },
  accuracy: { type: Number, required: true },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('CognitiveMetric', cognitiveMetricSchema);