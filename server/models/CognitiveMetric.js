const mongoose = require('mongoose');

const cognitiveMetricSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  gameName: { type: String, required: true },
  accuracy: { type: Number, required: true },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('CognitiveMetric', cognitiveMetricSchema);