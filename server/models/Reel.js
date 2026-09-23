const mongoose = require('mongoose');

const ReelSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['memory_photo', 'voice_note', 'game_quiz'], 
    required: true 
  },
  mediaUrl: { 
    type: String // URL to the image or audio file
  },
  caption: { 
    type: String // e.g., "Do you remember where this was taken?"
  },
  // For the interactive options you mentioned:
  options: [{ 
    type: String // e.g., ["Mysuru Palace", "Chamundi Hill", "Home"]
  }],
  correctAnswer: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Reel', ReelSchema);