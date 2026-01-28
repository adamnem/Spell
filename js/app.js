/**
 * App module - main controller, screen navigation, and initialization.
 */
const App = (() => {
  const screens = ['menu', 'pick-list', 'game', 'upload', 'progress', 'manage'];

  function init() {
    // Load built-in class lists on first run
    ClassLists.init();
  }

  function navigate(screen, param) {
    // Hide all screens
    screens.forEach(s => {
      document.getElementById(`screen-${s}`).classList.remove('active');
    });

    // Show target screen
    const target = document.getElementById(`screen-${screen}`);
    if (target) {
      target.classList.add('active');
    }

    // Screen-specific initialization
    switch (screen) {
      case 'pick-list':
        renderListPicker();
        break;
      case 'game':
        startGame(param);
        break;
      case 'upload':
        OCR.resetUploadForm();
        break;
      case 'progress':
        Progress.renderProgressScreen();
        break;
      case 'manage':
        Progress.renderManageScreen();
        break;
    }
  }

  function startGame(mode) {
    if (!mode) {
      showToast('Please pick a list first.');
      navigate('pick-list');
      return;
    }

    if (mode === 'review') {
      const allWords = Storage.getAllWords();
      if (allWords.length === 0) {
        showToast('No words to review! Add a word list first.');
        navigate('menu');
        return;
      }
    } else {
      // mode is a list ID
      const list = Storage.getWordList(mode);
      if (!list || list.words.length === 0) {
        showToast('That list has no words.');
        navigate('pick-list');
        return;
      }
    }

    Game.init(mode);
  }

  // === List Picker ===

  function renderListPicker() {
    const container = document.getElementById('pick-list-items');
    const lists = Storage.getWordLists();
    const progress = Storage.getWordProgress();

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
      const testDateStr = list.testDate ? formatDate(list.testDate) : '';

      // Calculate list progress
      let practiced = 0;
      let mastered = 0;
      for (const word of list.words) {
        const p = progress[word.toLowerCase()];
        if (p && p.totalAttempts > 0) {
          practiced++;
          if (p.successRate >= 0.8) mastered++;
        }
      }

      const tags = _getUniqueTags(list);
      const tagsHtml = tags.length > 0
        ? tags.map(t => `<span class="pick-list-tag">${escapeHTML(t)}</span>`).join('')
        : '';

      html += `
        <div class="pick-list-card" onclick="App.navigate('game', '${list.id}')">
          <div class="pick-list-card-title">${escapeHTML(title)}</div>
          ${testDateStr ? `<div class="pick-list-card-date">Test: ${escapeHTML(testDateStr)}</div>` : ''}
          ${tagsHtml ? `<div class="pick-list-card-tags">${tagsHtml}</div>` : ''}
          <div class="pick-list-card-meta">
            ${list.words.length} words &middot; ${practiced} practiced &middot; ${mastered} mastered
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function _getListTitle(list) {
    if (list.label) return list.label;
    if (list.weekNumber) return `Week ${list.weekNumber}`;
    if (list.testDate) return `Test ${formatDate(list.testDate)}`;
    return 'Word List';
  }

  function _getUniqueTags(list) {
    const tagSet = new Set();
    if (list.defaultTag) tagSet.add(list.defaultTag);
    if (list.tags) {
      for (const tag of Object.values(list.tags)) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function showToast(message) {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
  }

  // Prevent zoom on double-tap for iOS
  document.addEventListener('DOMContentLoaded', () => {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Initialize app
    init();
  });

  /**
   * Escape HTML special characters to prevent XSS when inserting
   * user-provided text into innerHTML.
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // === Settings Modal ===

  function openSettings() {
    const modal = document.getElementById('settings-modal');
    const slider = document.getElementById('voice-speed');
    const valueEl = document.getElementById('voice-speed-value');

    const settings = Storage.getSettings();
    slider.value = settings.voiceRate || 0.8;
    valueEl.textContent = slider.value + 'x';

    slider.oninput = () => {
      valueEl.textContent = slider.value + 'x';
    };

    modal.classList.remove('hidden');
  }

  function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  }

  function saveSettings() {
    const slider = document.getElementById('voice-speed');
    const settings = Storage.getSettings();
    settings.voiceRate = parseFloat(slider.value);
    Storage.saveSettings(settings);
    closeSettings();
    showToast('Settings saved!');
  }

  return {
    navigate,
    showToast,
    escapeHTML,
    formatDate,
    openSettings,
    closeSettings,
    saveSettings,
  };
})();
