const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const memoryRoutes = require('./routes/memoryRoutes');
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const insightRoutes = require('./routes/insightRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const patientRoutes = require('./routes/patientRoutes');
const companionRoutes = require('./routes/companionRoutes');
const myDayRoutes = require('./routes/myDayRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const caregiverRoutes = require('./routes/caregiverRoutes');
const reelRoutes = require('./routes/reels');

const CognitiveMetric = require('./models/CognitiveMetric');
const Reminder = require('./models/Reminder');
const GameResult = require('./models/GameResult');
const User = require('./models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { apiLimiter, authLimiter, companionLimiter } = require('./middlewares/rateLimiter');
const { verifyToken, requireRole } = require('./middlewares/authMiddleware');

const app = express();

// Security and utility middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static('uploads'));

// Global API rate limiting
app.use('/api', apiLimiter);

// Dedicated route modules
app.use('/api/auth', authRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/insight', insightRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/companion', companionLimiter, companionRoutes);
app.use('/api/myday', myDayRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/reels', reelRoutes);

// Database connection
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smriti_care';
mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB connected securely to', mongoUri))
  .catch((err) => {
    console.warn('⚠️ MongoDB connection warning (Running in resilient mode):', err.message);
  });

// Health check endpoints
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ONLINE', 
    service: 'Smriti AI Memory Care Gateway', 
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Protected route: fetch patients for Caregiver / Clinician selection
app.get('/api/patients', verifyToken, requireRole(['Caregiver', 'HealthcareWorker', 'Admin']), async (req, res) => {
  try {
    const patients = await User.find({ role: 'Patient' }).select('-password -otp');
    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Database error fetching patients', error: error.message });
  }
});

// Caregiver / Patient Activity Endpoints
app.get('/api/patients/:id/activity', verifyToken, async (req, res) => {
  try {
    if (req.userRole === 'Patient' && String(req.userId) !== String(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot view another patient\'s activity' });
    }
    const activities = await GameResult.find({ 
      patientId: req.params.id,
      gameName: { $exists: true } 
    }).sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ recentGames: activities });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity', error: error.message });
  }
});

app.get('/api/caregiver-dashboard/activity/:id', verifyToken, requireRole(['Caregiver', 'HealthcareWorker', 'Admin']), async (req, res) => {
  try {
    const activities = await GameResult.find({ 
      patientId: req.params.id,
      gameName: { $exists: true } 
    }).sort({ createdAt: -1 }).limit(10); 
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity' });
  }
});

// Cognitive Trends
app.get('/api/caregiver-dashboard/progress/:id', verifyToken, requireRole(['Caregiver', 'HealthcareWorker', 'Admin']), async (req, res) => {
  try {
    const trends = await CognitiveMetric.find({ patientId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(7); 
    res.status(200).json(trends);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trends' });
  }
});

app.get('/api/patients/:id/cognitive-trends', verifyToken, async (req, res) => {
  try {
    if (req.userRole === 'Patient' && String(req.userId) !== String(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot view another patient\'s cognitive trends' });
    }
    const trends = await CognitiveMetric.find({ patientId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(7); 
    res.status(200).json(trends);
  } catch (error) {
    console.error("Failed to fetch trends:", error);
    res.status(500).json({ message: 'Error fetching cognitive trends' });
  }
});

// Family Messages & Notes
app.get('/api/patients/:id/family-messages', verifyToken, async (req, res) => {
  try {
    res.status(200).json([]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

app.get('/api/patients/:id/notes', verifyToken, async (req, res) => {
  try {
    res.status(200).json([]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notes' });
  }
});

app.get('/api/patients/:id/preferences', verifyToken, async (req, res) => {
  try {
    if (req.userRole === 'Patient' && String(req.userId) !== String(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const user = await User.findById(req.params.id).select('preferences');
    res.status(200).json(user?.preferences || { comfortMode: false, largeText: true });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching preferences' });
  }
});

app.post('/api/games/save', verifyToken, async (req, res) => {
  try {
    let { patientId, gameName, score, accuracy } = req.body;
    if (req.userRole === 'Patient') {
      patientId = String(req.userId);
    }
    const newGame = new GameResult({ patientId, gameName, score, accuracy });
    await newGame.save();

    const newMetric = new CognitiveMetric({ patientId, accuracy, gameName });
    await newMetric.save();

    res.status(200).json({ message: 'Game saved successfully!' });
  } catch (error) {
    console.error("Failed to save game data:", error);
    res.status(500).json({ message: 'Server error saving game' });
  }
});

// Clinical Report Synthesis (Strict DPDP/Medical Compliance + Authorization)
app.get('/api/patients/:id/report', verifyToken, requireRole(['HealthcareWorker', 'Caregiver', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    let dateFilter = {};
    if (from && to) {
      dateFilter = {
        createdAt: { 
          $gte: new Date(from), 
          $lte: new Date(new Date(to).setHours(23, 59, 59)) 
        }
      };
    }

    const games = await GameResult.find({ patientId: id, gameName: { $exists: true }, ...dateFilter });
    const reminders = await Reminder.find({ patientId: id, ...dateFilter });

    const totalGames = games.length;
    const avgAccuracy = totalGames > 0 
      ? Math.round(games.reduce((sum, g) => sum + (g.accuracy || 0), 0) / totalGames) 
      : 0;
      
    const completedReminders = reminders.filter(r => r.status === 'completed').length;
    const adherenceRate = reminders.length > 0 
      ? Math.round((completedReminders / reminders.length) * 100) 
      : 0;

    let aiNarrative = "";
    if (totalGames === 0 && reminders.length === 0) {
      aiNarrative = "Insufficient data in the selected date range to generate a clinical observation.";
    } else {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
        
        const prompt = `
          You are an AI assistant generating an observational report for a Healthcare Worker. 
          Data for this period: Patient completed ${totalGames} cognitive exercises with an average accuracy of ${avgAccuracy}%. 
          Medication adherence rate is ${adherenceRate}% (${completedReminders} out of ${reminders.length} tasks).
          
          CRITICAL MEDICAL CONSTRAINT: You must write a 3-sentence summary of this data. 
          You must ONLY state observations. You must NEVER offer a diagnosis. 
          DO NOT mention the words "Dementia", "Alzheimer's", or "worsening". 
          Write in a highly professional, clinical tone.
        `;
        
        const result = await model.generateContent(prompt);
        aiNarrative = result.response.text();
      } catch (apiError) {
        console.warn("⚠️ Gemini API limited. Using fallback clinical observation.");
        aiNarrative = `Patient shows an average cognitive exercise accuracy of ${avgAccuracy}% over ${totalGames} sessions. Medication schedule adherence is currently at ${adherenceRate}%. Routine monitoring should continue as planned.`;
      }
    }

    res.status(200).json({
      metrics: {
        totalGames,
        avgAccuracy,
        totalReminders: reminders.length,
        adherenceRate
      },
      aiNarrative,
      disclaimer: "This report is generated from application usage data and AI observation. It does not constitute a formal clinical diagnosis."
    });
  } catch (error) {
    console.error("Report Generation Error:", error);
    res.status(500).json({ message: 'Failed to generate clinical report' });
  }
});

// Voice Companion Direct Endpoint
app.post('/api/companion/talk', async (req, res) => {
  try {
    const { transcript } = req.body;
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
    
    const systemPrompt = `
      You are a warm, friendly, and compassionate AI companion for an elderly memory care patient. 
      The patient just said this to you: "${transcript}"
      Respond in 1 or 2 short, simple sentences. Be extremely reassuring, kind, and conversational. 
      Do not ask complex questions. Do not sound like a robot.
    `;
    
    const result = await model.generateContent(systemPrompt);
    let aiReply = result.response.text().replace(/\*/g, '');
    
    res.status(200).json({ reply: aiReply });
  } catch (error) {
    console.error("Voice Companion Error:", error);
    res.status(200).json({ reply: "I'm having a little trouble hearing you right now, but I am right here with you." });
  }
});

// Adaptive Cognitive Engine
app.get('/api/engine/adaptive-difficulty/:patientId', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    if (req.userRole === 'Patient' && String(req.userId) !== String(patientId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot access another patient\'s adaptive profile' });
    }

    const recentGames = await GameResult.find({ 
      patientId, 
      gameName: { $exists: true } 
    }).sort({ createdAt: -1 }).limit(3);

    if (recentGames.length === 0) {
      return res.status(200).json({ 
        difficulty: 'MEDIUM', 
        optionsCount: 3,
        reason: 'Baseline established for new patient.' 
      });
    }

    const avgAccuracy = Math.round(
      recentGames.reduce((sum, game) => sum + (game.accuracy || 0), 0) / recentGames.length
    );

    let difficulty = 'MEDIUM';
    let optionsCount = 3;

    if (avgAccuracy < 50) {
      difficulty = 'EASY';
      optionsCount = 2;
    } else if (avgAccuracy >= 85) {
      difficulty = 'HARD';
      optionsCount = 4;
    }

    res.status(200).json({
      difficulty,
      optionsCount,
      avgAccuracy,
      reason: `Patient average accuracy is ${avgAccuracy}%. Adapting game to ${difficulty} mode.`
    });
  } catch (error) {
    console.error("Adaptive Engine Error:", error);
    res.status(500).json({ message: 'Failed to calculate adaptive difficulty.' });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`🚀 Smriti Server running on port ${PORT}`));

module.exports = { app, server };