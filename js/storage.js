/**
 * Storage module - handles all data persistence using localStorage.
 */
const Storage = (() => {
  const KEYS = {
    WORD_LISTS: 'spell_wordLists',
    WORD_PROGRESS: 'spell_wordProgress',
    CURRENT_WEEK: 'spell_currentWeek',
    SETTINGS: 'spell_settings',
  };

  function _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }

  // === Word Lists ===

  function getWordLists() {
    return _get(KEYS.WORD_LISTS) || [];
  }

  function saveWordList(list) {
    const lists = getWordLists();
    const existingIndex = lists.findIndex(l => l.id === list.id);
    if (existingIndex >= 0) {
      lists[existingIndex] = list;
    } else {
      lists.push(list);
    }
    _set(KEYS.WORD_LISTS, lists);
    // Auto-set as current week if none set
    if (!getCurrentWeekId() || lists.length === 1) {
      setCurrentWeek(list.id);
    }
  }

  function deleteWordList(listId) {
    const lists = getWordLists().filter(l => l.id !== listId);
    _set(KEYS.WORD_LISTS, lists);
    if (getCurrentWeekId() === listId) {
      setCurrentWeek(lists.length > 0 ? lists[lists.length - 1].id : null);
    }
  }

  function getWordList(listId) {
    return getWordLists().find(l => l.id === listId) || null;
  }

  // === Current Week ===

  function getCurrentWeekId() {
    return _get(KEYS.CURRENT_WEEK);
  }

  function setCurrentWeek(listId) {
    _set(KEYS.CURRENT_WEEK, listId);
  }

  function getCurrentWeekList() {
    const id = getCurrentWeekId();
    return id ? getWordList(id) : null;
  }

  // === Word Progress ===

  function getWordProgress() {
    return _get(KEYS.WORD_PROGRESS) || {};
  }

  function getProgressForWord(word) {
    const progress = getWordProgress();
    return progress[word.toLowerCase()] || null;
  }

  function recordAttempt(word, guessCount, success) {
    const progress = getWordProgress();
    const key = word.toLowerCase();
    if (!progress[key]) {
      progress[key] = {
        word: key,
        attempts: [],
        lastPracticed: null,
        nextReview: null,
        totalAttempts: 0,
        totalSuccesses: 0,
      };
    }
    const p = progress[key];
    p.attempts.push({ guesses: guessCount, success, date: new Date().toISOString() });
    p.totalAttempts++;
    if (success) p.totalSuccesses++;
    p.lastPracticed = new Date().toISOString();
    p.successRate = p.totalAttempts > 0 ? p.totalSuccesses / p.totalAttempts : 0;

    // Calculate next review date based on spaced repetition
    p.nextReview = SpacedRep.calculateNextReview(guessCount, success);

    _set(KEYS.WORD_PROGRESS, progress);
    return p;
  }

  // === All Words (flattened from all lists) ===

  function getAllWords() {
    const lists = getWordLists();
    const words = [];
    const seen = new Set();
    for (const list of lists) {
      for (const word of list.words) {
        const lower = word.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          words.push({ word: lower, weekId: list.id, weekNumber: list.weekNumber });
        }
      }
    }
    return words;
  }

  // === Tags ===

  function getTagForWord(word, listId) {
    const list = listId ? getWordList(listId) : null;
    if (!list) {
      // Search all lists for the word
      const lists = getWordLists();
      for (const l of lists) {
        if (l.words.map(w => w.toLowerCase()).includes(word.toLowerCase())) {
          return _resolveTag(l, word);
        }
      }
      return null;
    }
    return _resolveTag(list, word);
  }

  function _resolveTag(list, word) {
    const key = word.toLowerCase();
    if (list.tags && list.tags[key]) {
      return list.tags[key];
    }
    return list.defaultTag || null;
  }

  // === Settings ===

  function getSettings() {
    return _get(KEYS.SETTINGS) || { voiceRate: 0.8, voicePitch: 1.0 };
  }

  function saveSettings(settings) {
    _set(KEYS.SETTINGS, settings);
  }

  return {
    getWordLists,
    saveWordList,
    deleteWordList,
    getWordList,
    getCurrentWeekId,
    setCurrentWeek,
    getCurrentWeekList,
    getWordProgress,
    getProgressForWord,
    recordAttempt,
    getAllWords,
    getTagForWord,
    getSettings,
    saveSettings,
  };
})();
