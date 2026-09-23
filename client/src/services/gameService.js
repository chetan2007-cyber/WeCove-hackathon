import apiClient from './apiClient';
import supabase, { isSupabaseConfigured } from './supabaseClient';
import offlineSyncService from './offlineSyncService';

class GameService {
  /**
   * Calculate adaptive difficulty based on recent game accuracy & speed
   * @param {string} patientId 
   * @returns {Promise<{ difficulty: 'EASY'|'MEDIUM'|'HARD', optionsCount: number, reason: string }>}
   */
  async getAdaptiveDifficulty(patientId) {
    if (!patientId) {
      return { difficulty: 'MEDIUM', optionsCount: 3, reason: 'Standard baseline.' };
    }

    try {
      if (isSupabaseConfigured) {
        const { data: recentGames } = await supabase
          .from('game_results')
          .select('accuracy, response_time_ms')
          .eq('patient_id', patientId)
          .order('completed_at', { ascending: false })
          .limit(5);

        if (!recentGames || recentGames.length === 0) {
          return { difficulty: 'MEDIUM', optionsCount: 3, reason: 'New patient baseline.' };
        }

        const avgAccuracy = Math.round(
          recentGames.reduce((acc, g) => acc + (g.accuracy || 0), 0) / recentGames.length
        );

        if (avgAccuracy < 50) {
          return {
            difficulty: 'EASY',
            optionsCount: 2,
            reason: `Average accuracy is ${avgAccuracy}%. Reducing choices to minimize cognitive fatigue.`
          };
        } else if (avgAccuracy >= 85) {
          return {
            difficulty: 'HARD',
            optionsCount: 4,
            reason: `High performance (${avgAccuracy}%). Adding mild challenge with 4 options.`
          };
        }

        return {
          difficulty: 'MEDIUM',
          optionsCount: 3,
          reason: `Steady engagement (${avgAccuracy}%). Balanced 3 options.`
        };
      }

      // API Gateway
      const res = await apiClient.get(`/engine/adaptive-difficulty/${patientId}`);
      return res.data;
    } catch (err) {
      return { difficulty: 'MEDIUM', optionsCount: 3, reason: 'Offline fallback difficulty.' };
    }
  }

  /**
   * Save game session result (Online or Queued Offline)
   */
  async saveGameSession(patientId, sessionData) {
    const payload = {
      patient_id: patientId,
      patientId: patientId,
      game_name: sessionData.gameName || 'Memory Journey',
      gameName: sessionData.gameName || 'Memory Journey',
      score: sessionData.score || 0,
      accuracy: sessionData.accuracy || 0,
      response_time_ms: sessionData.responseTime || 4500,
      difficulty_level: sessionData.difficulty || 'MEDIUM',
      client_uuid: sessionData.uuid || crypto.randomUUID(),
      completed_at: new Date().toISOString()
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueueAction('GAME_SESSION_SAVE', payload);
      return { success: true, offline: true, message: 'Game result saved locally. Will sync when back online.' };
    }

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('game_results')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }

      const res = await apiClient.post('/games/save', payload);
      return { success: true, data: res.data };
    } catch (err) {
      // Enqueue to offline sync on failure
      offlineSyncService.enqueueAction('GAME_SESSION_SAVE', payload);
      return { success: true, offline: true, message: 'Server unreachable. Result queued locally.' };
    }
  }

  /**
   * Log an individual question interaction
   */
  async logInteraction(patientId, memoryId, isCorrect, responseTimeMs) {
    try {
      await apiClient.post('/game/result', {
        patientId,
        memoryId,
        isCorrect,
        responseTime: responseTimeMs
      });
    } catch (err) {
      // Non-blocking telemetry
    }
  }
}

export const gameService = new GameService();
export default gameService;
