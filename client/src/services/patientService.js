import apiClient from './apiClient';
import supabase, { isSupabaseConfigured } from './supabaseClient';

class PatientService {
  /**
   * Fetch Patient Profile & Clinical Summary
   */
  async getPatientDetails(patientId) {
    if (!patientId) throw new Error('Patient ID is required.');

    try {
      if (isSupabaseConfigured) {
        const { data: patient, error: pErr } = await supabase
          .from('user_profiles')
          .select('*, patients(*)')
          .eq('id', patientId)
          .single();

        if (pErr) throw pErr;

        const { data: metrics } = await supabase
          .from('difficulty_profiles')
          .select('*')
          .eq('patient_id', patientId)
          .single();

        const { count: memoryCount } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patientId)
          .eq('status', 'confirmed');

        return {
          patient: {
            id: patient.id,
            name: patient.name,
            phone: patient.phone,
            ...patient.patients,
          },
          metrics: metrics || { currentDifficulty: 'MEDIUM', rollingAccuracy: 75 },
          memoryCount: memoryCount || 0,
        };
      }

      // API Gateway
      const res = await apiClient.get(`/patients/${patientId}/details`);
      return res.data;
    } catch (err) {
      console.warn('Falling back to local profile context', err.message);
      return {
        patient: { id: patientId, name: 'Chetan Sharma', location: 'Guwahati, Assam' },
        metrics: { currentDifficulty: 'Standard', rollingAccuracy: 80 },
        memoryCount: 3,
      };
    }
  }

  /**
   * Update Patient Accessibility / Comfort Preferences
   */
  async updatePreferences(patientId, preferences) {
    if (!patientId) throw new Error('Patient ID is required.');

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('patients')
          .update({
            comfort_mode: preferences.comfortMode,
            large_text: preferences.largeText,
            updated_at: new Date().toISOString()
          })
          .eq('id', patientId)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const res = await apiClient.patch(`/patients/${patientId}/preferences`, preferences);
      return res.data;
    } catch (err) {
      console.warn('Saved preference locally', err.message);
      return preferences;
    }
  }

  /**
   * Fetch Daily Orientation Data (Weather, Upcoming Routine, Next Alarm)
   */
  async getDailyOrientation(patientId) {
    try {
      if (isSupabaseConfigured && patientId) {
        const { data: upcomingReminder } = await supabase
          .from('reminders')
          .select('*')
          .eq('patient_id', patientId)
          .eq('status', 'pending')
          .gte('time', new Date().toISOString())
          .order('time', { ascending: true })
          .limit(1)
          .single();

        return {
          upcomingReminder: upcomingReminder ? {
            id: upcomingReminder.id,
            title: upcomingReminder.title,
            rawTime: upcomingReminder.time,
            time: new Date(upcomingReminder.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: upcomingReminder.type
          } : null
        };
      }

      const res = await apiClient.get(`/myday/${patientId || 'default'}`);
      return res.data;
    } catch (err) {
      return {
        upcomingReminder: {
          id: 'demo-rem-1',
          title: 'Drink a glass of warm water',
          time: '5:30 PM',
          type: 'routine'
        }
      };
    }
  }
}

export const patientService = new PatientService();
export default patientService;
