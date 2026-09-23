import apiClient from './apiClient';

const QUEUE_STORAGE_KEY = 'smriti_offline_sync_queue';

class OfflineSyncService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyStatus('online');
    this.flushQueue();
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyStatus('offline');
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyStatus(status) {
    this.listeners.forEach((cb) => {
      try {
        cb(status, { isOnline: this.isOnline, queueLength: this.getQueue().length });
      } catch (e) {
        // ignore
      }
    });
  }

  getQueue() {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveQueue(queue) {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Sync queue storage failed', e);
    }
  }

  /**
   * Enqueue action for background replay
   */
  enqueueAction(actionType, payload) {
    const queue = this.getQueue();
    const actionItem = {
      id: crypto.randomUUID(),
      type: actionType,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    queue.push(actionItem);
    this.saveQueue(queue);
    this.notifyStatus('queued');

    if (this.isOnline) {
      this.flushQueue();
    }
  }

  /**
   * Flush pending items with exponential backoff
   */
  async flushQueue() {
    if (this.isSyncing || !this.isOnline) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    this.notifyStatus('syncing');

    const remainingItems = [];

    for (const item of queue) {
      try {
        await this.replayItem(item);
      } catch (err) {
        item.retryCount = (item.retryCount || 0) + 1;
        // Keep in queue if fewer than 5 retries
        if (item.retryCount < 5) {
          remainingItems.push(item);
        } else {
          console.error('Dropped sync item after 5 failed retries', item);
        }
      }
    }

    this.saveQueue(remainingItems);
    this.isSyncing = false;
    this.notifyStatus(remainingItems.length === 0 ? 'synced' : 'pending');
  }

  async replayItem(item) {
    switch (item.type) {
      case 'GAME_SESSION_SAVE':
        await apiClient.post('/games/save', item.payload);
        break;
      case 'REMINDER_CREATE':
        await apiClient.post('/reminders', item.payload);
        break;
      case 'REMINDER_STATUS':
        await apiClient.patch(`/reminders/${item.payload.id}/status`, { status: item.payload.status });
        break;
      case 'PREFERENCES_UPDATE':
        await apiClient.patch(`/patients/${item.payload.patientId}/preferences`, item.payload.preferences);
        break;
      default:
        console.warn('Unknown sync item type:', item.type);
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
