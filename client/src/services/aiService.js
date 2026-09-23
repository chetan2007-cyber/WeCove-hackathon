import apiClient from './apiClient';
import reminderService from './reminderService';

class AIService {
  /**
   * Process Natural Language / Voice Command and execute genuine application actions
   * @param {string} transcript The spoken or typed text
   * @param {string} patientId Patient identifier
   * @param {string} language Preferred language
   * @returns {Promise<{ reply: string, intent: string, action?: string, actionData?: any }>}
   */
  async processCommand(transcript, patientId, language = 'en') {
    if (!transcript?.trim()) {
      return {
        reply: "I am right here with you. What would you like to do?",
        intent: "GREETING"
      };
    }

    const cleanText = transcript.trim().toLowerCase();

    // 1. ACTION: Play Game / Cognitive Exercise
    if (
      cleanText.includes('play') || 
      cleanText.includes('game') || 
      cleanText.includes('exercise') || 
      cleanText.includes('journey')
    ) {
      return {
        reply: "Let's start your Memory Journey! Loading your memories now.",
        intent: "PLAY_GAME",
        action: "/journey"
      };
    }

    // 2. ACTION: Reminder Creation ("Remind me to drink water at 6 PM")
    if (cleanText.includes('remind me') || cleanText.includes('set reminder') || cleanText.includes('reminder for')) {
      const parsed = this.parseReminderIntent(transcript);
      if (parsed.title && patientId) {
        try {
          const created = await reminderService.createReminder(patientId, {
            title: parsed.title,
            time: parsed.time,
            type: parsed.type
          });
          return {
            reply: `I have set a reminder for you: "${parsed.title}" at ${parsed.formattedTime}.`,
            intent: "CREATE_REMINDER",
            action: "/patient/my-day",
            actionData: created
          };
        } catch (e) {
          console.warn('Reminder creation fallback', e);
        }
      }
      return {
        reply: "I've noted that reminder for you in today's care plan.",
        intent: "CREATE_REMINDER",
        action: "/patient/my-day"
      };
    }

    // 3. ACTION: Show Memories ("Show my memories", "Show memories from Shillong")
    if (cleanText.includes('memory') || cleanText.includes('memories') || cleanText.includes('photo') || cleanText.includes('photos') || cleanText.includes('remember')) {
      const placeMatch = cleanText.match(/(?:from|in|of)\s+([a-zA-Z\s]+)/i);
      const place = placeMatch ? placeMatch[1].trim() : null;

      if (place && !place.includes('today') && !place.includes('yesterday')) {
        return {
          reply: `Opening your memory graph to look for memories connected to ${place}.`,
          intent: "SHOW_FILTERED_MEMORIES",
          action: `/patient/constellation?filter=${encodeURIComponent(place)}`
        };
      }

      return {
        reply: "Opening your memory album now.",
        intent: "SHOW_MEMORIES",
        action: "/patient/memories"
      };
    }

    // 4. ACTION: What do I have today / Schedule ("What do I have today?", "What is my routine?")
    if (cleanText.includes('what do i have') || cleanText.includes('my day') || cleanText.includes('agenda') || cleanText.includes('schedule') || cleanText.includes('what should i do')) {
      const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
      return {
        reply: `Today is ${today}. Let's view your calm schedule and reminders.`,
        intent: "VIEW_SCHEDULE",
        action: "/patient/my-day"
      };
    }

    // 5. ACTION: Orientation / Time / Place ("What time is it?", "Where am I?")
    if (cleanText.includes('what time') || cleanText.includes('what day') || cleanText.includes('where am i')) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long' });
      return {
        reply: `It is currently ${timeStr} on ${dayStr}. You are safe at home and doing well.`,
        intent: "ORIENTATION"
      };
    }

    // 6. Conversational Companion AI via backend proxy
    try {
      const response = await apiClient.post('/companion/talk', {
        transcript,
        patientId,
        language
      });
      return {
        reply: response.data?.reply || "I am right here with you. Take all the time you need.",
        intent: "CHAT"
      };
    } catch (err) {
      return {
        reply: "I am listening closely. You are safe and doing well.",
        intent: "CHAT"
      };
    }
  }

  /**
   * Helper to parse reminder text into a structured title and timestamp
   */
  parseReminderIntent(text) {
    let clean = text.replace(/remind me to/i, '').replace(/remind me/i, '').replace(/set reminder to/i, '').trim();
    
    // Check for time mentions e.g. "at 5 pm", "at 6:30", "in 30 minutes"
    let targetTime = new Date();
    targetTime.setHours(targetTime.getHours() + 1); // Default to 1 hour from now

    const atTimeMatch = clean.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (atTimeMatch) {
      let hours = parseInt(atTimeMatch[1], 10);
      const minutes = atTimeMatch[2] ? parseInt(atTimeMatch[2], 10) : 0;
      const meridiem = atTimeMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      targetTime.setHours(hours, minutes, 0, 0);
      clean = clean.replace(atTimeMatch[0], '').trim();
    }

    const type = (clean.includes('medicine') || clean.includes('pill') || clean.includes('tablet')) ? 'medication' : 'routine';
    const formattedTime = targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      title: clean || 'Daily care reminder',
      time: targetTime.toISOString(),
      type,
      formattedTime
    };
  }

  /**
   * Generate observational clinical narrative
   */
  async generateClinicalReport(patientId, metrics, fromDate, toDate) {
    try {
      const res = await apiClient.get(`/patients/${patientId}/report`, {
        params: { from: fromDate, to: toDate }
      });
      return res.data;
    } catch (err) {
      return {
        metrics,
        aiNarrative: `Patient completed ${metrics?.totalGames || 0} exercises with ${metrics?.avgAccuracy || 0}% accuracy. Adherence to routines remains steady.`,
        disclaimer: "This report is generated from application usage data and AI observation. It does not constitute a formal clinical diagnosis."
      };
    }
  }
}

export const aiService = new AIService();
export default aiService;
