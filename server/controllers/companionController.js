exports.processVoiceIntent = async (req, res) => {
  try {
    const { transcript, patientId, preferredLanguage = 'English' } = req.body;
    const text = transcript.toLowerCase();
    
    let intent = "Unknown";
    let responseText = "I'm here to help. Could you repeat that?";
    let action = null; 
    let cue = "";

    // Blueprint Requirement: Multilingual Detection Cue
    // (Simulating detection: If they speak Spanish "hola" but prefer English)
    if (text.includes('hola') || text.includes('bonjour') || text.includes('namaste')) {
      cue = `I heard that, and I will answer in ${preferredLanguage}. `;
    }

    // 1. OrientationService
    if (text.includes('what day') || text.includes('time') || text.includes('where am i')) {
      intent = "OrientationService";
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      responseText = `${cue}Today is ${today}. You are safe and doing well.`;
    }
    
    // 2. Memory Retrieval Service (WITH PLACE FILTER as per Blueprint)
    else if (text.includes('memory') || text.includes('remember') || text.includes('show me')) {
      intent = "MemoryRetrievalService";
      
      // Extract the location if they say "memory from [Place]"
      const placeMatch = text.match(/from\s+([a-zA-Z]+)/);
      const place = placeMatch ? placeMatch[1] : null;

      if (place) {
        // Capitalize the place name for the UI
        const formattedPlace = place.charAt(0).toUpperCase() + place.slice(1);
        responseText = `${cue}Let's look at your memories from ${formattedPlace}.`;
        // Pass the extracted place as a URL parameter to filter the constellation!
        action = `/patient/constellation?filter=${formattedPlace}`;
      } else {
        responseText = `${cue}Let's look at some memories. I'll open your memory graph now.`;
        action = '/patient/constellation'; 
      }
    }
    
    // 3. Routine/Recommendation Service
    else if (text.includes('next activity') || text.includes('routine') || text.includes('what should i do')) {
      intent = "RoutineService";
      responseText = `${cue}You have a light walk scheduled soon. Would you like me to set a reminder?`;
    }
    
    // 4. Reminder Service (Snooze)
    else if (text.includes('remind me later') || text.includes('snooze')) {
      intent = "ReminderService";
      responseText = `${cue}Got it. I will remind you again in 30 minutes.`;
    }
    
    // 5. Activity Recommendation Service
    else if (text.includes('game') || text.includes('play')) {
      intent = "ActivityRecommendationService";
      responseText = `${cue}I'd love to play a game! Let's start a memory journey.`;
      action = '/journey';
    }

    res.status(200).json({ intent, responseText, action, preferredLanguage });
  } catch (error) {
    console.error("Companion Error:", error);
    res.status(500).json({ message: 'Engine failure' });
  }
};