const mongoose = require('mongoose');

const memoryItemSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  mediaUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  aiSuggestions: {
    people: [{ type: String }],
    place: { type: String },
    event: { type: String },
    objects: [{ type: String }],
    mood: { type: String },
    dateCues: { type: String }
  },
  status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, default: 'caregiver' },
});

module.exports = mongoose.model('MemoryItem', memoryItemSchema);