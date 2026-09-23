const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Adjust this if your user model is named differently
    required: true 
  },
  title: { type: String, required: true },
  time: { type: Date, required: true },
  type: { 
    type: String, 
    enum: ['medication', 'routine', 'social', 'medical'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'snoozed'], 
    default: 'pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);