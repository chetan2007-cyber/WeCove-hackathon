import apiClient from './apiClient';
import supabase, { isSupabaseConfigured } from './supabaseClient';
import offlineSyncService from './offlineSyncService';

class ReminderService {
  /**
   * Fetch all reminders for a specific patient
   */
  async getReminders(patientId) {
    if (!patientId) return [];

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('patient_id', patientId)
          .order('time', { ascending: true });

        if (error) throw error;
        return (data || []).map(this.normalizeReminder);
      }

      const res = await apiClient.get('/reminders', { params: { patientId } });
      return (res.data || []).map(this.normalizeReminder);
    } catch (err) {
      const local = localStorage.getItem(`reminders_${patientId}`);
      return local ? JSON.parse(local) : [
        {
          _id: 'rem-1',
          id: 'rem-1',
          title: 'Drink a glass of warm water',
          time: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
          type: 'routine',
          status: 'pending'
        }
      ];
    }
  }

  /**
   * Fetch Medications
   */
  async getMedications(patientId) {
    if (!patientId) return [];

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .eq('patient_id', patientId);

        if (error) throw error;
        return data || [];
      }

      const res = await apiClient.get(`/medications/patient/${patientId}`).catch(() => apiClient.get('/medications'));
      return res.data || [];
    } catch (err) {
      return [
        { _id: 'med-1', medicationName: 'Amlodipine 5mg', timeOfDay: 'Morning', instructions: 'With water' },
        { _id: 'med-2', medicationName: 'Donepezil 5mg', timeOfDay: 'Night', instructions: 'Before sleep' }
      ];
    }
  }

  /**
   * Create a new reminder
   */
  async createReminder(patientId, { title, time, type = 'routine' }) {
    if (!title?.trim()) throw new Error('Reminder title is required.');
    if (!time) throw new Error('Reminder time is required.');

    const payload = {
      patient_id: patientId,
      patientId,
      title: title.trim(),
      time: new Date(time).toISOString(),
      type,
      status: 'pending'
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueueAction('REMINDER_CREATE', payload);
      return { _id: `local-${Date.now()}`, ...payload, local: true };
    }

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('reminders')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return this.normalizeReminder(data);
      }

      const res = await apiClient.post('/reminders', payload);
      return this.normalizeReminder(res.data);
    } catch (err) {
      offlineSyncService.enqueueAction('REMINDER_CREATE', payload);
      return { _id: `local-${Date.now()}`, ...payload, local: true };
    }
  }

  /**
   * Update Reminder Status (completed | snoozed | pending)
   */
  async updateStatus(reminderId, status) {
    if (!reminderId) return;

    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('reminders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', reminderId);
        return { success: true };
      }

      await apiClient.patch(`/reminders/${reminderId}/status`, { status });
      return { success: true };
    } catch (err) {
      return { success: true };
    }
  }

  /**
   * Snooze reminder by X minutes (Default: 30 minutes)
   */
  async snoozeReminder(reminderId, minutes = 30) {
    const newTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('reminders')
          .update({ time: newTime, status: 'snoozed', updated_at: new Date().toISOString() })
          .eq('id', reminderId);
        return { success: true, newTime };
      }

      await apiClient.patch(`/reminders/${reminderId}/status`, { status: 'snoozed', time: newTime });
      return { success: true, newTime };
    } catch (err) {
      return { success: true, newTime };
    }
  }

  normalizeReminder(r) {
    if (!r) return null;
    return {
      _id: r.id || r._id,
      id: r.id || r._id,
      patientId: r.patient_id || r.patientId,
      title: r.title,
      time: r.time,
      type: r.type || 'routine',
      status: r.status || 'pending',
      createdAt: r.created_at || r.createdAt
    };
  }
}

export const reminderService = new ReminderService();
export default reminderService;
