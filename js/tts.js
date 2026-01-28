/**
 * Text-to-Speech module.
 * Primary: Puter.js neural voices (high quality, free, no API key).
 * Fallback: Web Speech API (built-in browser voices).
 */
const TTS = (() => {
  let voices = [];
  let preferredVoice = null;
  let puterReady = false;
  let puterFailed = false;
  let currentAudio = null;

  function init() {
    // Initialize Web Speech API as fallback
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        voices = speechSynthesis.getVoices();
        preferredVoice =
          voices.find(v => v.name.includes('Samantha')) ||
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

    // Check if Puter.js is available (loaded via CDN in index.html)
    checkPuter();
  }

  function checkPuter() {
    if (typeof puter !== 'undefined' && puter.ai && puter.ai.txt2speech) {
      puterReady = true;
    } else {
      // Retry after a short delay in case script is still loading
      setTimeout(() => {
        if (typeof puter !== 'undefined' && puter.ai && puter.ai.txt2speech) {
          puterReady = true;
        }
      }, 2000);
    }
  }

  /**
   * Speak text using Puter.js neural voice, falling back to Web Speech API.
   */
  function speak(text, callback) {
    // Stop any currently playing audio
    stopCurrent();

    if (puterReady && !puterFailed) {
      speakWithPuter(text, callback);
    } else {
      speakWithWebSpeech(text, callback);
    }
  }

  function stopCurrent() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  function speakWithPuter(text, callback) {
    puter.ai.txt2speech(text, {
      voice: 'Ruth',
      engine: 'neural',
      language: 'en-US',
    })
    .then((audio) => {
      currentAudio = audio;
      audio.onended = () => {
        currentAudio = null;
        if (callback) callback();
      };
      audio.onerror = () => {
        currentAudio = null;
        // Fall back to Web Speech API on error
        speakWithWebSpeech(text, callback);
      };
      audio.play().catch(() => {
        // Autoplay blocked or other error - fall back
        speakWithWebSpeech(text, callback);
      });
    })
    .catch(() => {
      // Puter.js failed - mark as failed and use fallback
      puterFailed = true;
      speakWithWebSpeech(text, callback);
    });
  }

  function speakWithWebSpeech(text, callback) {
    if (!('speechSynthesis' in window)) {
      if (callback) callback();
      return;
    }

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
