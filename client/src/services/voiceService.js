/**
 * Voice Service: Web Speech API Integration for Elderly Care
 * Handles Speech-to-Text (STT) and Text-to-Speech (TTS)
 */

const LANG_CODE_MAP = {
  en: 'en-IN',
  as: 'as-IN', // Assamese
  bn: 'bn-IN', // Bengali
  mni: 'mni-IN', // Manipuri / Meitei
  lus: 'en-IN', // Mizo
  kha: 'en-IN'  // Khasi
};

class VoiceService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
  }

  isSpeechRecognitionSupported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  isSpeechSynthesisSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Start Speech-to-Text recognition session
   * @param {string} langCode Current language
   * @param {function} onInterim Intermediate speech results
   * @param {function} onFinal Final transcribed result
   * @param {function} onError Error callback
   */
  startListening(langCode = 'en', onInterim, onFinal, onError) {
    if (!this.isSpeechRecognitionSupported()) {
      if (onError) onError('Speech recognition is not supported in this browser.');
      return;
    }

    this.stopSpeaking();
    this.stopListening();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = LANG_CODE_MAP[langCode] || 'en-IN';
    this.recognition.interimResults = true;
    this.recognition.continuous = false;

    let finalTranscript = '';

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (onInterim && interim) onInterim(interim);
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (event.error !== 'no-speech' && onError) {
        onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onFinal) onFinal(finalTranscript.trim());
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isListening = false;
      if (onError) onError(e.message);
    }
  }

  /**
   * Stop active listening
   */
  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.isListening = false;
  }

  /**
   * Text to speech playback with elderly-friendly pacing
   * @param {string} text 
   * @param {string} langCode 
   * @param {function} onStart 
   * @param {function} onEnd 
   */
  speak(text, langCode = 'en', onStart, onEnd) {
    if (!this.isSpeechSynthesisSupported() || !text) {
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();

    const cleanText = text.replace(/[*_#`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = LANG_CODE_MAP[langCode] || 'en-IN';
    utterance.rate = 0.88; // Gentle, clear speed for memory care
    utterance.pitch = 1.0;

    // Pick gentle female voice if available
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Heera')) &&
      (v.lang.startsWith(utterance.lang.substring(0, 2)) || v.lang.startsWith('en'))
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    if (onStart) utterance.onstart = onStart;
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Immediately cancel any running speech playback
   */
  stopSpeaking() {
    if (this.isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceService = new VoiceService();
export default voiceService;
