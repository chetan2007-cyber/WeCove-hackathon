const GameResult = require('../models/GameResult');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.generateInsight = async (req, res) => {
  try {
    const { patientId } = req.params;

    // 1. Fetch ALL completed game sessions (Filters out the individual question clicks)
    const allGames = await GameResult.find({ 
      patientId, 
      gameName: { $exists: true } 
    }).sort({ createdAt: -1 });

    if (allGames.length === 0) {
      return res.status(200).json({ 
        accuracy: 0, 
        recentGamesCount: 0,
        insight: "Not enough data yet. Patient needs to complete a Memory Journey." 
      });
    }

    // 2. Calculate real metrics across all full sessions
    const recentGamesCount = allGames.length;
    const totalAccuracy = allGames.reduce((sum, game) => sum + (game.accuracy || 0), 0);
    const averageAccuracy = Math.round(totalAccuracy / recentGamesCount);

    let aiText = "";
    
    // 3. Request Observation from Gemini
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
      
      const prompt = `You are a supportive assistant for a caregiver. The patient recently completed ${recentGamesCount} cognitive memory exercises with an average accuracy of ${averageAccuracy}%. Write a brief, encouraging 2-sentence observation about their engagement. STRICT RULE: DO NOT diagnose. Do not mention Alzheimer's or Dementia. Just observe the activity data.`;
      
      const result = await model.generateContent(prompt);
      aiText = result.response.text();
    } catch (apiError) {
      console.warn("⚠️ Gemini API overloaded. Using fallback insight.");
      aiText = `The patient has maintained an average accuracy of ${averageAccuracy}% over their ${recentGamesCount} completed sessions. They are consistently engaging with the daily routines.`;
    }

    // 4. Enforce Part A Non-Negotiable Rule: Mandatory Disclaimer
    const finalInsight = `[AI SUGGESTION]\n${aiText}\n\n*DISCLAIMER: This observation is based purely on app usage data. It is not a clinical diagnosis. Always consult a Healthcare Professional for medical evaluations.*`;

    res.status(200).json({ 
      accuracy: averageAccuracy, 
      recentGamesCount: recentGamesCount, 
      insight: finalInsight 
    });

  } catch (error) {
    console.error("Insight Engine Error:", error);
    res.status(500).json({ message: 'Failed to generate insight' });
  }
};