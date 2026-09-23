/**
 * Notification Service
 * Manages in-app audio alerts and Browser Web Notifications
 */

class NotificationService {
  constructor() {
    this.hasPermission = false;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
    }
  }

  async requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch (e) {
      return false;
    }
  }

  /**
   * Play soothing chime sound using Web Audio API (No external sound file dependency)
   */
  playCalmChime() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // Gentle two-note chime (E5 -> G#5)
      playTone(659.25, now, 0.8);
      playTone(830.61, now + 0.3, 1.2);
    } catch (e) {
      // Audio playback blocked or not supported
    }
  }

  /**
   * Trigger in-app chime and desktop notification
   */
  notify({ title, body, icon = '/favicon.ico', type = 'medication' }) {
    this.playCalmChime();

    if (this.hasPermission && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification(title, {
          body,
          icon,
          badge: icon,
          tag: type
        });
      } catch (e) {
        // notification suppressed
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
