import apiClient from './apiClient';
import supabase, { isSupabaseConfigured } from './supabaseClient';

class CaregiverService {
  /**
   * Fetch all authorized patients assigned to this caregiver
   */
  async getAuthorizedPatients(caregiverId) {
    try {
      if (isSupabaseConfigured && caregiverId) {
        const { data, error } = await supabase
          .from('patient_caregivers')
          .select(`
            patient_id,
            status,
            patients:patient_id (
              id,
              user_profiles:id (
                id,
                name,
                phone,
                preferred_language
              )
            )
          `)
          .eq('caregiver_id', caregiverId)
          .eq('status', 'AUTHORIZED');

        if (error) throw error;
        
        return (data || []).map(row => ({
          _id: row.patient_id,
          id: row.patient_id,
          name: row.patients?.user_profiles?.name || 'Assigned Patient',
          phone: row.patients?.user_profiles?.phone || '',
          role: 'Patient'
        }));
      }

      // API Gateway
      const res = await apiClient.get('/patients');
      return res.data;
    } catch (err) {
      console.warn('Falling back to default patient list', err.message);
      return [
        { _id: '11111111-1111-1111-1111-111111111111', id: '11111111-1111-1111-1111-111111111111', name: 'Chetan Sharma', role: 'Patient' }
      ];
    }
  }

  /**
   * Fetch Patient Cognitive Activity Feed
   */
  async getPatientActivity(patientId) {
    if (!patientId) return [];

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('game_results')
          .select('*')
          .eq('patient_id', patientId)
          .order('completed_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        return data || [];
      }

      const res = await apiClient.get(`/caregiver-dashboard/activity/${patientId}`);
      return res.data;
    } catch (err) {
      return [];
    }
  }

  /**
   * Fetch Patient Cognitive Trends
   */
  async getCognitiveTrends(patientId) {
    if (!patientId) return [];

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('game_results')
          .select('completed_at, accuracy, score, game_name')
          .eq('patient_id', patientId)
          .order('completed_at', { ascending: true })
          .limit(14);

        if (error) throw error;
        return data || [];
      }

      const res = await apiClient.get(`/patients/${patientId}/cognitive-trends`);
      return res.data;
    } catch (err) {
      return [];
    }
  }

  /**
   * Fetch Caregiver Clinical Notes
   */
  async getNotes(patientId) {
    if (!patientId) return [];

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('caregiver_notes')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      }

      const res = await apiClient.get(`/patients/${patientId}/notes`);
      return res.data;
    } catch (err) {
      const local = localStorage.getItem(`notes_${patientId}`);
      return local ? JSON.parse(local) : [];
    }
  }

  /**
   * Save Caregiver Clinical Note
   */
  async saveNote(patientId, caregiverId, text, createdByName = 'Caregiver') {
    if (!text?.trim()) throw new Error('Note text cannot be empty.');

    const notePayload = {
      patient_id: patientId,
      caregiver_id: caregiverId,
      note_text: text.trim(),
      created_by_name: createdByName,
      created_at: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('caregiver_notes')
          .insert(notePayload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const res = await apiClient.post(`/patients/${patientId}/notes`, notePayload);
      return res.data;
    } catch (err) {
      // Local fallback
      const local = this.getNotes(patientId);
      const updated = [{ id: Date.now().toString(), text, createdBy: createdByName, createdAt: new Date() }, ...local];
      localStorage.setItem(`notes_${patientId}`, JSON.stringify(updated));
      return updated[0];
    }
  }

  /**
   * Send Family Message
   */
  async sendFamilyMessage(patientId, senderName, senderRole, message) {
    if (!message?.trim()) throw new Error('Message cannot be empty.');

    const payload = {
      patient_id: patientId,
      sender_name: senderName || 'Family Member',
      sender_role: senderRole || 'Daughter',
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('family_messages')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const res = await apiClient.post(`/patients/${patientId}/family-messages`, payload);
      return res.data;
    } catch (err) {
      const localMsgs = JSON.parse(localStorage.getItem('hackathon_family') || '[]');
      const newMsg = { id: Date.now(), sender: senderName, content: message, time: 'Just now' };
      localStorage.setItem('hackathon_family', JSON.stringify([newMsg, ...localMsgs]));
      return newMsg;
    }
  }
}

export const caregiverService = new CaregiverService();
export default caregiverService;
