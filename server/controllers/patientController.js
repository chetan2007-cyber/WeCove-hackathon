const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const CognitiveMetric = require('../models/CognitiveMetric');
const MemoryItem = require('../models/MemoryItem');

// Ensure you have GEMINI_API_KEY in your server/.env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Get Orientation Data (My Day)
exports.getMyDay = async (req, res) => {
  try {
    const orientationData = {
      weather: { condition: 'Clear & Sunny', temp: '72°F / 22°C', icon: '☀️' },
      location: { general: 'At Home', specific: 'Living Room', icon: '📍' },
      date: new Date()
    };
    res.status(200).json(orientationData);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orientation data', error: error.message });
  }
};

// 2. Update Patient Preferences (Settings)
exports.updatePreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { comfortMode, largeText } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { 
        $set: { 
          'preferences.comfortMode': comfortMode,
          'preferences.largeText': largeText 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.status(200).json({ message: 'Preferences updated successfully', preferences: updatedUser.preferences });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update preferences', error: error.message });
  }
};

// 3. AI Voice Companion (Live Gemini Integration)
// 3. AI Voice Companion (Live Gemini Integration)
exports.processVoiceQuery = async (req, res) => {
  try {
    const { transcript, patientId } = req.body;
    
    if (!transcript || transcript.trim() === "") {
      return res.status(200).json({ reply: "I'm here whenever you're ready to talk." });
    }

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });

    const prompt = `
      You are a cheerful, friendly, and comforting daily companion for an elderly person. 
      Your goal is to chat warmly, share positivity, and make them feel happy and safe.
      
      Rules:
      1. Keep your response short (1 sentence).
      2. Be upbeat, conversational, and natural. NEVER assume the user is sick, in pain, or sad unless they explicitly say so.
      3. Focus on pleasant everyday topics, cheerful greetings, or lighthearted conversation.
      
      The patient says: "${transcript}"
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.status(200).json({ reply: responseText.trim() });

  } catch (error) {
    console.error('Gemini AI Error:', error);
    // This will now print the EXACT error on your frontend screen!
    res.status(200).json({ 
      reply: `Connection Error: ${error.message}` 
    });
  }
};

exports.getPatientDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Aggregate all patient data for the caregiver dashboard
    const patient = await User.findById(id).select('-password');
    const metrics = await CognitiveMetric.findOne({ patientId: id });
    const memoryCount = await MemoryItem.countDocuments({ patientId: id, status: 'confirmed' });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.status(200).json({ 
      patient, 
      metrics: metrics || { currentDifficulty: 'Standard', rollingAccuracy: 0 }, 
      memoryCount 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch patient details', error: error.message });
  }
};