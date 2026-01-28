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
    let totalMastered = 0;
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
          <p>No words yet! Add a word list to get started.</p>
        </div>
      `;
      return;
    }

    const lists = Storage.getWordLists();
    let html = '';

    // "Needs Practice" section
    const needsPractice = SpacedRep.getWordsNeedingPractice(20)
      .filter(w => w.urgency > 20);

    if (needsPractice.length > 0) {
      html += '<h3 class="progress-section-title">Needs More Practice</h3>';
      for (const w of needsPractice) {
        const tag = Storage.getTagForWord(w.word, w.weekId);
        html += renderWordItem(w.word, w.progress, tag);
      }
    }

    // Show words grouped by list, then by tag within each list
    for (const list of lists) {
      const title = _getListTitle(list);
      const testInfo = list.testDate ? ` &middot; Test: ${App.escapeHTML(App.formatDate(list.testDate))}` : '';
      html += `<h3 class="progress-section-title">${App.escapeHTML(title)}${testInfo}</h3>`;

      // Group words by tag
      const tagGroups = _groupWordsByTag(list);

      for (const group of tagGroups) {
        if (group.tag && tagGroups.length > 1) {
          html += `<div class="progress-tag-group-label">${App.escapeHTML(group.tag)}</div>`;
        }
        for (const word of group.words) {
          const p = progress[word.toLowerCase()] || null;
          html += renderWordItem(word, p, group.tag);
        }
      }
    }

    container.innerHTML = html;
  }

  function _getListTitle(list) {
    if (list.label) return list.label;
    if (list.weekNumber) return `Week ${list.weekNumber}`;
    if (list.testDate) return `Test ${App.formatDate(list.testDate)}`;
    return 'Word List';
  }

  function _groupWordsByTag(list) {
    const groups = {};

    for (const word of list.words) {
      const tag = Storage.getTagForWord(word, list.id) || '(no tag)';
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(word);
    }

    // Sort: default tag first, then alphabetically
    const keys = Object.keys(groups);
    keys.sort((a, b) => {
      if (a === list.defaultTag) return -1;
      if (b === list.defaultTag) return 1;
      return a.localeCompare(b);
    });

    return keys.map(tag => ({ tag: tag === '(no tag)' ? null : tag, words: groups[tag] }));
  }

  function renderWordItem(word, progress, tag) {
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

    const tagBadge = tag
      ? `<span class="progress-word-tag-badge">${App.escapeHTML(tag)}</span>`
      : '';

    return `
      <div class="progress-word-item ${needsPracticeClass}">
        <div class="progress-word-left">
          <span class="progress-word-text">${App.escapeHTML(word)}</span>
          ${tagBadge}
        </div>
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

    if (lists.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128203;</div>
          <p>No word lists yet! Add one to get started.</p>
          <button class="menu-btn btn-upload" onclick="App.navigate('upload')">
            <span class="btn-icon">&#128247;</span>
            Add Word List
          </button>
        </div>
      `;
      return;
    }

    let html = '';

    for (const list of lists) {
      const title = _getListTitle(list);
      const testDateStr = list.testDate ? App.formatDate(list.testDate) : '';
      const builtInBadge = list.isBuiltIn ? '<span class="built-in-badge">Class List</span>' : '';

      html += `
        <div class="manage-list-card">
          <div class="manage-list-header">
            <div>
              <div class="manage-list-title">${App.escapeHTML(title)} ${builtInBadge}</div>
              <div class="manage-list-meta">
                ${testDateStr ? `Test: ${App.escapeHTML(testDateStr)} &middot; ` : ''}${list.words.length} words
              </div>
            </div>
          </div>
          <div class="manage-list-words">
            ${list.words.map(w => {
              const tag = Storage.getTagForWord(w, list.id);
              const tagAttr = tag ? ` title="${App.escapeHTML(tag)}"` : '';
              return `<span class="manage-word-tag"${tagAttr}>${App.escapeHTML(w)}</span>`;
            }).join('')}
          </div>
          <div class="manage-list-actions">
            <button class="btn-delete-list" onclick="Progress.confirmDeleteList('${list.id}', '${App.escapeHTML(title)}')">Delete</button>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function confirmDeleteList(listId, label) {
    if (confirm(`Delete "${label}" and all its words? This cannot be undone.`)) {
      Storage.deleteWordList(listId);
      // Also remove from class lists loaded tracker if built-in
      const loaded = localStorage.getItem('spell_classListsLoaded') || '';
      const loadedIds = loaded.split(',').filter(id => id !== listId);
      localStorage.setItem('spell_classListsLoaded', loadedIds.join(','));

      renderManageScreen();
      App.showToast('Word list deleted.');
    }
  }

  return {
    renderProgressScreen,
    renderManageScreen,
    confirmDeleteList,
  };
})();
