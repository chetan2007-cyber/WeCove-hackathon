const mongoose = require('mongoose');

const constellationNodeSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entityType: { type: String, enum: ['Person', 'Place', 'Event'], required: true },
  name: { type: String, required: true },
  relatedMemories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MemoryItem' }],
  recognitionStrength: { type: Number, default: 0 } // Tracks how often the patient correctly identifies this specific entity
}, { timestamps: true });

module.exports = mongoose.model('ConstellationNode', constellationNodeSchema);