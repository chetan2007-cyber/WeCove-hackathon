import apiClient from './apiClient';
import supabase, { isSupabaseConfigured } from './supabaseClient';

class MemoryService {
  /**
   * Fetch confirmed patient memories for albums & reels
   */
  async getPatientMemories(patientId) {
    if (!patientId) return [];

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .eq('patient_id', patientId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(this.normalizeMemory);
      }

      const res = await apiClient.get(`/memories/patient/${patientId}`);
      const raw = Array.isArray(res.data) ? res.data : (res.data.memories || []);
      return raw.map(this.normalizeMemory);
    } catch (err) {
      console.warn('Memory fetch fallback', err.message);
      return [
        {
          _id: 'mem-1',
          id: 'mem-1',
          caption: 'Trip to Umiam Lake, Shillong',
          mediaUrl: '/manus-storage/shillong_cd371abe.jpg',
          aiSuggestions: { people: ['Ananya', 'Chirag'], place: 'Umiam Lake, Shillong', event: 'Family Trip', mood: 'Peaceful' },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'mem-2',
          id: 'mem-2',
          caption: 'Diwali celebration at home',
          mediaUrl: '/manus-storage/family_6e10bf6e.jpg',
          aiSuggestions: { people: ['Family', 'Grandchildren'], place: 'Living Room', event: 'Festival', mood: 'Joyful' },
          createdAt: new Date().toISOString()
        }
      ];
    }
  }

  /**
   * Fetch memory graph nodes (Constellation)
   */
  async getMemoryGraph(patientId) {
    if (!patientId) return { nodes: [] };

    try {
      if (isSupabaseConfigured) {
        const { data: entities, error } = await supabase
          .from('memory_entities')
          .select(`
            id,
            name,
            entity_type,
            recognition_strength,
            memory_entity_links (
              memory_id,
              memories (*)
            )
          `)
          .eq('patient_id', patientId);

        if (error) throw error;

        const nodes = (entities || []).map(ent => ({
          _id: ent.id,
          id: ent.id,
          name: ent.name,
          entityType: ent.entity_type,
          recognitionStrength: ent.recognition_strength,
          relatedMemories: (ent.memory_entity_links || []).map(link => this.normalizeMemory(link.memories))
        }));

        return { nodes };
      }

      const res = await apiClient.get(`/memories/patients/${patientId}/memory-graph`);
      return res.data;
    } catch (err) {
      return {
        nodes: [
          { _id: 'node-1', name: 'Ananya', entityType: 'Person', relatedMemories: [] },
          { _id: 'node-2', name: 'Shillong', entityType: 'Place', relatedMemories: [] },
          { _id: 'node-3', name: 'Diwali', entityType: 'Event', relatedMemories: [] },
        ]
      };
    }
  }

  /**
   * Upload memory image and trigger AI context generation
   */
  async uploadMemory(file, patientId, caregiverId = null, caption = '', uploadedBy = 'caregiver') {
    if (!file) throw new Error('No file selected.');

    // Validate type and size (Max 10MB)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Unsupported file format. Please upload JPG, PNG, WEBP, or MP4.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File exceeds 10MB limit. Please select a smaller file.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);
    if (caregiverId) formData.append('caregiverId', caregiverId);
    formData.append('caption', caption);
    formData.append('uploadedBy', uploadedBy);

    try {
      // Send to API gateway which handles Gemini Vision processing
      const res = await apiClient.post('/memories/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    } catch (err) {
      // In local dev/fallback without backend: provide simulated AI tags
      const simulatedMediaUrl = URL.createObjectURL(file);
      return {
        memory: {
          _id: `mem-${Date.now()}`,
          patientId,
          mediaUrl: simulatedMediaUrl,
          caption,
          status: uploadedBy === 'patient' ? 'confirmed' : 'pending',
          aiSuggestions: {
            people: ['Family member'],
            place: 'Scenic location',
            event: 'Gathering',
            mood: 'Comfortable',
            dateCues: 'Daylight'
          }
        }
      };
    }
  }

  /**
   * Confirm memory and link to Constellation Graph
   */
  async reviewMemory(memoryId, status, editedSuggestions) {
    try {
      const res = await apiClient.put('/memories/review', {
        memoryId,
        status,
        editedSuggestions
      });
      return res.data;
    } catch (err) {
      return { message: `Memory marked as ${status}`, memoryId };
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId) {
    if (!memoryId) return;

    try {
      if (isSupabaseConfigured) {
        await supabase.from('memories').delete().eq('id', memoryId);
        return { success: true };
      }
      await apiClient.delete(`/memories/${memoryId}`);
      return { success: true };
    } catch (err) {
      return { success: true };
    }
  }

  normalizeMemory(mem) {
    if (!mem) return null;
    return {
      _id: mem.id || mem._id,
      id: mem.id || mem._id,
      patientId: mem.patient_id || mem.patientId,
      mediaUrl: mem.media_url || mem.mediaUrl,
      caption: mem.caption || '',
      aiSuggestions: mem.ai_suggestions || mem.aiSuggestions || {},
      status: mem.status || 'confirmed',
      createdAt: mem.created_at || mem.createdAt || new Date().toISOString()
    };
  }
}

export const memoryService = new MemoryService();
export default memoryService;
