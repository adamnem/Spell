/**
 * Progress module - renders progress reports and manages word lists.
 */
const Progress = (() => {

  function renderProgressScreen() {
    renderStats();
    renderWordProgress();
  }

  function renderStats() {
    const container = document.getElementById('progress-stats');
    const allWords = Storage.getAllWords();
    const progress = Storage.getWordProgress();

    let totalPracticed = 0;
    let totalMastered = 0; // success rate >= 80%
    let totalAttempts = 0;

    for (const w of allWords) {
      const p = progress[w.word];
      if (p && p.totalAttempts > 0) {
        totalPracticed++;
        totalAttempts += p.totalAttempts;
        if (p.successRate >= 0.8) totalMastered++;
      }
    }

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${allWords.length}</div>
        <div class="stat-label">Total Words</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalPracticed}</div>
        <div class="stat-label">Practiced</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalMastered}</div>
        <div class="stat-label">Mastered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalAttempts}</div>
        <div class="stat-label">Total Tries</div>
      </div>
    `;
  }

  function renderWordProgress() {
    const container = document.getElementById('progress-words');
    const allWords = Storage.getAllWords();
    const progress = Storage.getWordProgress();

    if (allWords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128214;</div>
          <p>No words yet! Upload a word list to get started.</p>
        </div>
      `;
      return;
    }

    // Group by week
    const lists = Storage.getWordLists();
    let html = '';

    // First show "Needs Practice" section
    const needsPractice = SpacedRep.getWordsNeedingPractice(20)
      .filter(w => w.urgency > 20);

    if (needsPractice.length > 0) {
      html += '<h3 class="progress-section-title">Needs More Practice</h3>';
      for (const w of needsPractice) {
        html += renderWordItem(w.word, w.progress);
      }
    }

    // Then show all words by list
    for (const list of lists) {
      const label = list.weekNumber ? `Week ${list.weekNumber}` : `List from ${list.date}`;
      html += `<h3 class="progress-section-title">${App.escapeHTML(label)}</h3>`;

      for (const word of list.words) {
        const p = progress[word.toLowerCase()] || null;
        html += renderWordItem(word, p);
      }
    }

    container.innerHTML = html;
  }

  function renderWordItem(word, progress) {
    let rate = 0;
    let rateText = 'New';
    let barClass = 'needs-work';
    let needsPracticeClass = '';

    if (progress && progress.totalAttempts > 0) {
      rate = Math.round(progress.successRate * 100);
      rateText = `${rate}%`;

      if (rate >= 80) barClass = 'good';
      else if (rate >= 50) barClass = 'medium';
      else barClass = 'needs-work';

      if (rate < 50) needsPracticeClass = 'needs-practice';
    }

    return `
      <div class="progress-word-item ${needsPracticeClass}">
        <span class="progress-word-text">${App.escapeHTML(word)}</span>
        <div class="progress-word-stats">
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${barClass}" style="width: ${rate}%"></div>
          </div>
          <span class="progress-word-rate">${rateText}</span>
        </div>
      </div>
    `;
  }

  // === Manage Word Lists ===

  function renderManageScreen() {
    const container = document.getElementById('manage-lists');
    const lists = Storage.getWordLists();
    const currentWeekId = Storage.getCurrentWeekId();

    if (lists.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128203;</div>
          <p>No word lists yet! Upload one to get started.</p>
          <button class="menu-btn btn-upload" onclick="App.navigate('upload')">
            <span class="btn-icon">&#128247;</span>
            Upload Word List
          </button>
        </div>
      `;
      return;
    }

    let html = '';

    for (const list of lists) {
      const isCurrent = list.id === currentWeekId;
      const label = list.weekNumber ? `Week ${list.weekNumber}` : 'Word List';
      const dateStr = list.date || '';

      html += `
        <div class="manage-list-card">
          <div class="manage-list-header">
            <div>
              <div class="manage-list-title">${App.escapeHTML(label)} ${isCurrent ? '(Current)' : ''}</div>
              <div class="manage-list-meta">${App.escapeHTML(dateStr)} &middot; ${list.words.length} words</div>
            </div>
          </div>
          <div class="manage-list-words">
            ${list.words.map(w => `<span class="manage-word-tag">${App.escapeHTML(w)}</span>`).join('')}
          </div>
          <div class="manage-list-actions">
            ${!isCurrent ? `<button class="btn-set-current" onclick="Progress.setCurrentWeek('${list.id}')">Set as Current</button>` : ''}
            <button class="btn-delete-list" onclick="Progress.confirmDeleteList('${list.id}', '${label}')">Delete</button>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function setCurrentWeek(listId) {
    Storage.setCurrentWeek(listId);
    renderManageScreen();
    App.showToast('Current week updated!');
  }

  function confirmDeleteList(listId, label) {
    if (confirm(`Delete "${label}" and all its words? This cannot be undone.`)) {
      Storage.deleteWordList(listId);
      renderManageScreen();
      App.showToast('Word list deleted.');
    }
  }

  return {
    renderProgressScreen,
    renderManageScreen,
    setCurrentWeek,
    confirmDeleteList,
  };
})();
