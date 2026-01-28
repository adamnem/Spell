/**
 * App module - main controller, screen navigation, and initialization.
 */
const App = (() => {
  const screens = ['menu', 'game', 'upload', 'progress', 'manage'];

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
    mode = mode || 'current';

    // Check if there are words to practice
    if (mode === 'current') {
      const list = Storage.getCurrentWeekList();
      if (!list || list.words.length === 0) {
        showToast('No words yet! Upload a word list first.');
        navigate('menu');
        return;
      }
    } else {
      const allWords = Storage.getAllWords();
      if (allWords.length === 0) {
        showToast('No words to review! Upload a word list first.');
        navigate('menu');
        return;
      }
    }

    Game.init(mode);
  }

  function showToast(message) {
    // Remove existing toasts
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

  return {
    navigate,
    showToast,
    escapeHTML,
  };
})();
