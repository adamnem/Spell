/**
 * Text-to-Speech module - handles speaking words using Web Speech API.
 */
const TTS = (() => {
  let voices = [];
  let preferredVoice = null;

  function init() {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      voices = speechSynthesis.getVoices();
      // Prefer a clear English voice
      preferredVoice =
        voices.find(v => v.name.includes('Samantha')) || // iOS
        voices.find(v => v.name.includes('Google US English')) ||
        voices.find(v => v.name.includes('Microsoft Zira')) ||
        voices.find(v => v.lang.startsWith('en') && v.localService) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  function speak(text, callback) {
    if (!('speechSynthesis' in window)) {
      if (callback) callback();
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const settings = Storage.getSettings();

    utterance.rate = settings.voiceRate || 0.85;
    utterance.pitch = settings.voicePitch || 1.0;
    utterance.volume = 1.0;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      if (callback) callback();
    };

    utterance.onerror = () => {
      if (callback) callback();
    };

    // Workaround for Chrome bug where speech stops after ~15 seconds
    speechSynthesis.speak(utterance);
  }

  function speakWord(word, callback) {
    speak(word, callback);
  }

  function speakEncouragement(message, callback) {
    speak(message, callback);
  }

  init();

  return {
    speak,
    speakWord,
    speakEncouragement,
    init,
  };
})();
