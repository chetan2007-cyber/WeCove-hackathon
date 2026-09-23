const express = require('express');
const router = express.Router();
const Reel = require('../models/Reel');

// GET: Fetch the patient's Reel feed
router.get('/:patientId', async (req, res) => {
  try {
    // Fetches reels sorted by newest, limit to 10 for performance
    const reels = await Reel.find({ patientId: req.params.patientId })
                            .sort({ createdAt: -1 })
                            .limit(10);
    res.json(reels);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reels." });
  }
});

// POST: Record when a patient answers a reel option
router.post('/interact', async (req, res) => {
  const { patientId, reelId, selectedOption, isCorrect } = req.body;
  try {
    // In a full build, you would save this to an Interaction/Metrics schema
    // to feed data back to the Caregiver Dashboard's AI insights.
    console.log(`Patient ${patientId} answered ${selectedOption}. Correct: ${isCorrect}`);
    res.status(200).json({ message: "Interaction recorded for AI analysis." });
  } catch (err) {
    res.status(500).json({ error: "Failed to record interaction." });
  }
});

module.exports = router;