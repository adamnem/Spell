/**
 * Spaced Repetition module - determines review scheduling and word selection.
 */
const SpacedRep = (() => {

  /**
   * Calculate the next review date based on performance.
   * - First try correct: review in 7 days
   * - 2-3 tries correct: review in 3 days
   * - 4-6 tries correct: review in 1 day
   * - Failed: review tomorrow
   */
  function calculateNextReview(guessCount, success) {
    const now = new Date();
    let daysUntilReview;

    if (!success) {
      daysUntilReview = 1;
    } else if (guessCount === 1) {
      daysUntilReview = 7;
    } else if (guessCount <= 3) {
      daysUntilReview = 3;
    } else {
      daysUntilReview = 1;
    }

    const next = new Date(now);
    next.setDate(next.getDate() + daysUntilReview);
    return next.toISOString();
  }

  /**
   * Select the next word to practice.
   * @param {string} mode - 'current' for this week, 'review' for mixed review
   * @returns {{ word: string, weekId: string } | null}
   */
  function selectNextWord(mode, excludeWords) {
    excludeWords = excludeWords || [];
    const excludeSet = new Set(excludeWords.map(w => w.toLowerCase()));
    const progress = Storage.getWordProgress();
    const now = new Date();

    let candidates = [];

    if (mode === 'current') {
      const currentList = Storage.getCurrentWeekList();
      if (!currentList || currentList.words.length === 0) return null;

      candidates = currentList.words
        .filter(w => !excludeSet.has(w.toLowerCase()))
        .map(w => ({
          word: w.toLowerCase(),
          weekId: currentList.id,
          progress: progress[w.toLowerCase()] || null,
        }));
    } else {
      // Review mode: all words from all lists
      const allWords = Storage.getAllWords();
      candidates = allWords
        .filter(w => !excludeSet.has(w.word))
        .map(w => ({
          word: w.word,
          weekId: w.weekId,
          progress: progress[w.word] || null,
        }));
    }

    if (candidates.length === 0) return null;

    // Score each word: lower score = higher priority for review
    const scored = candidates.map(c => {
      let priority = 0;

      if (!c.progress) {
        // Never practiced - high priority
        priority = 100;
      } else {
        const p = c.progress;

        // Words due for review get high priority
        if (p.nextReview && new Date(p.nextReview) <= now) {
          priority += 80;
        }

        // Words with low success rate get higher priority
        if (p.successRate !== undefined) {
          priority += (1 - p.successRate) * 50;
        }

        // Words never successfully spelled get highest priority
        if (p.totalSuccesses === 0 && p.totalAttempts > 0) {
          priority += 90;
        }

        // Words not practiced recently get slight boost
        if (p.lastPracticed) {
          const daysSince = (now - new Date(p.lastPracticed)) / (1000 * 60 * 60 * 24);
          priority += Math.min(daysSince * 2, 20);
        }
      }

      // Add small random factor to avoid strict ordering
      priority += Math.random() * 10;

      return { ...c, priority };
    });

    // Sort by priority (highest first) and pick the top word
    scored.sort((a, b) => b.priority - a.priority);
    return { word: scored[0].word, weekId: scored[0].weekId };
  }

  /**
   * Get words that need the most practice.
   */
  function getWordsNeedingPractice(limit) {
    limit = limit || 10;
    const allWords = Storage.getAllWords();
    const progress = Storage.getWordProgress();
    const now = new Date();

    const scored = allWords.map(w => {
      const p = progress[w.word];
      let urgency = 0;

      if (!p) {
        urgency = 50; // Never practiced
      } else {
        if (p.successRate < 0.5) urgency += 40;
        else if (p.successRate < 0.8) urgency += 20;

        if (p.nextReview && new Date(p.nextReview) <= now) {
          urgency += 30;
        }
      }

      return { ...w, urgency, progress: p || null };
    });

    scored.sort((a, b) => b.urgency - a.urgency);
    return scored.slice(0, limit);
  }

  return {
    calculateNextReview,
    selectNextWord,
    getWordsNeedingPractice,
  };
})();
