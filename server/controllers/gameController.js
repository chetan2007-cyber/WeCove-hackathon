const MemoryItem = require('../models/MemoryItem');
const ConstellationNode = require('../models/ConstellationNode');
const GameResult = require('../models/GameResult');
const CognitiveMetric = require('../models/CognitiveMetric');

exports.generateDailyActivity = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user && req.userRole === 'Patient' && String(req.userId) !== String(patientId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot request games for another patient' });
    }

    // 1. Fetch ALL confirmed memories for this patient
    let availableMemories = await MemoryItem.find({ 
      patientId: patientId,
      status: 'confirmed' 
    }).sort({ createdAt: 1 });

    if (availableMemories.length === 0) {
      availableMemories = await MemoryItem.find({ status: 'confirmed' });
    }

    if (availableMemories.length === 0) {
      return res.status(404).json({ message: "No confirmed memories available anywhere." });
    }

    // 2. ROTATION LOGIC: Count how many games this patient has played so far
    const playedGamesCount = await GameResult.countDocuments({ patientId });
    const rotationIndex = playedGamesCount % availableMemories.length;
    const selectedMemory = availableMemories[rotationIndex];
    
    res.status(200).json({
      activityId: `ACT-${Date.now()}`,
      memory: selectedMemory,
      directive: "Identify the primary subject in this confirmed memory."
    });

  } catch (error) {
    console.error("Personalization Engine Error:", error);
    res.status(500).json({ message: 'Failed to generate activity', error: error.message });
  }
};

exports.saveResult = async (req, res) => {
  try {
    let { patientId, memoryId, memoryItem, isCorrect, responseTime } = req.body;
    if (req.user && req.userRole === 'Patient') {
      patientId = String(req.userId);
    }
    const resolvedMemoryId = memoryId || memoryItem;

    // 1. Save the individual answer
    const newResult = new GameResult({
      patientId,
      memoryId: resolvedMemoryId,
      memoryItem: resolvedMemoryId,
      isCorrect,
      responseTime: responseTime || 5000,
      completedAt: new Date()
    });
    await newResult.save();

    // 2. ADAPTIVE DIFFICULTY ENGINE (C.5 Spec)
    // Fetch the last 5 games to establish a short-term trend
    const recentGames = await GameResult.find({ patientId }).sort({ completedAt: -1 }).limit(5);
    
    const correctCount = recentGames.filter(game => game.isCorrect).length;
    const rollingAccuracy = recentGames.length > 0 ? Math.round((correctCount / recentGames.length) * 100) : 0;
    
    const totalResponseTime = recentGames.reduce((sum, game) => sum + (game.responseTime || 5000), 0);
    const avgResponseTime = recentGames.length > 0 ? totalResponseTime / recentGames.length : 5000;

    // Fetch or create their metric profile
    let metric = await CognitiveMetric.findOne({ patientId });
    if (!metric) {
      metric = new CognitiveMetric({ patientId });
    }

    // Engine Logic: Adjust difficulty based on accuracy + speed
    let newDifficulty = metric.currentDifficulty;

    if (recentGames.length >= 3) { // Only adjust if we have enough data
      if (rollingAccuracy >= 80 && avgResponseTime < 4000) {
        // High accuracy & fast (<4s) -> Increase Difficulty
        if (newDifficulty === 'Standard') newDifficulty = 'Hard';
        else if (newDifficulty === 'Easy') newDifficulty = 'Standard';
        else if (newDifficulty === 'Comfort') newDifficulty = 'Easy';
      } 
      else if (rollingAccuracy <= 40 || avgResponseTime > 10000) {
        // Low accuracy or very slow (>10s) -> Decrease Difficulty or trigger Comfort Mode
        if (newDifficulty === 'Hard') newDifficulty = 'Standard';
        else if (newDifficulty === 'Standard') newDifficulty = 'Easy';
        else if (newDifficulty === 'Easy') newDifficulty = 'Comfort';
      }
    }

    // Save the new tuning parameters
    metric.currentDifficulty = newDifficulty;
    metric.rollingAccuracy = rollingAccuracy;
    metric.averageResponseTime = avgResponseTime;
    metric.lastAdjustedAt = new Date();
    await metric.save();

    res.status(201).json({ 
      message: 'Result saved and difficulty tuned.',
      newAccuracy: rollingAccuracy,
      currentDifficulty: newDifficulty
    });

  } catch (error) {
    console.error("Failed to save game result:", error);
    res.status(500).json({ message: 'Error saving result', error: error.message });
  }
};