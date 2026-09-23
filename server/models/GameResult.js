const mongoose = require('mongoose');

const gameResultSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Old fields (for individual clicks - optional now)
  memoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MemoryItem' },
  isCorrect: { type: Boolean },
  responseTime: { type: Number },

  // NEW fields (for full session tracking)
  gameName: { type: String },
  score: { type: Number },
  accuracy: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('GameResult', gameResultSchema);