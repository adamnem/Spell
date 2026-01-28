/**
 * Game module - Wordle-style spelling game engine.
 */
const Game = (() => {
  const MAX_GUESSES = 6;

  let currentWord = '';
  let currentGuess = '';
  let guessNumber = 0;
  let guesses = [];
  let gameOver = false;
  let mode = 'current'; // 'current' or 'review'
  let wordsPlayedThisSession = [];
  let wordCount = 0;
  let totalWordsInSession = 0;
  let lengthRevealed = false;

  // Keyboard state
  let keyStates = {};

  function init(gameMode) {
    mode = gameMode;
    wordsPlayedThisSession = [];
    wordCount = 0;

    // Count total available words
    if (mode === 'current') {
      const list = Storage.getCurrentWeekList();
      totalWordsInSession = list ? list.words.length : 0;
    } else {
      totalWordsInSession = Storage.getAllWords().length;
    }

    loadNextWord();
  }

  function loadNextWord() {
    const selected = SpacedRep.selectNextWord(mode, wordsPlayedThisSession);

    if (!selected) {
      showMessage("You've practiced all available words! Great job!");
      document.getElementById('game-result').classList.remove('hidden');
      document.getElementById('result-icon').textContent = '\u2B50';
      document.getElementById('result-title').textContent = 'All Done!';
      document.getElementById('result-message').textContent =
        "You've gone through all the words. Come back later for more practice!";
      document.getElementById('result-word').textContent = '';
      // Hide "Next Word" button
      const btns = document.querySelector('.result-buttons');
      btns.children[0].classList.add('hidden');
      return;
    }

    currentWord = selected.word.toLowerCase();
    currentGuess = '';
    guessNumber = 0;
    guesses = [];
    gameOver = false;
    lengthRevealed = false;
    keyStates = {};
    wordCount++;

    updateWordCount();
    renderBoard();
    updateKeyboard();
    hideResult();
    clearMessage();
    hideLengthHint();

    // Speak the word after a brief delay
    setTimeout(() => speakWord(), 400);
  }

  function nextWord() {
    wordsPlayedThisSession.push(currentWord);
    loadNextWord();
  }

  function speakWord() {
    TTS.speakWord(currentWord);
  }

  function renderBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';

    for (let row = 0; row < MAX_GUESSES; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.id = `row-${row}`;

      if (row < guesses.length) {
        // Completed guess - show with colors
        const guess = guesses[row];
        const result = evaluateGuess(guess);
        for (let col = 0; col < guess.length; col++) {
          const tile = createTile(guess[col], result[col]);
          rowEl.appendChild(tile);
        }
      } else if (row === guessNumber && !gameOver) {
        // Current row - show what's been typed
        const wordLen = lengthRevealed ? currentWord.length : Math.max(currentGuess.length, 1);
        const displayLen = lengthRevealed ? currentWord.length : Math.max(currentGuess.length, 5);

        for (let col = 0; col < displayLen; col++) {
          const letter = col < currentGuess.length ? currentGuess[col] : '';
          const tile = createTile(letter, letter ? 'filled' : 'empty');
          rowEl.appendChild(tile);
        }
      } else if (lengthRevealed) {
        // Empty future row with known length
        for (let col = 0; col < currentWord.length; col++) {
          const tile = createTile('', 'empty');
          rowEl.appendChild(tile);
        }
      }
      // Don't render empty rows before length is revealed (except current)

      board.appendChild(rowEl);
    }
  }

  function createTile(letter, state) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    if (state && state !== 'empty') tile.classList.add(state);
    tile.textContent = letter.toUpperCase();
    return tile;
  }

  /**
   * Evaluate a guess against the current word.
   * Returns array of states: 'correct', 'present', or 'absent'.
   */
  function evaluateGuess(guess) {
    const result = new Array(guess.length).fill('absent');
    const wordLetters = currentWord.split('');
    const used = new Array(currentWord.length).fill(false);

    // First pass: find correct positions
    for (let i = 0; i < guess.length; i++) {
      if (i < currentWord.length && guess[i] === wordLetters[i]) {
        result[i] = 'correct';
        used[i] = true;
      }
    }

    // Second pass: find present but wrong position
    for (let i = 0; i < guess.length; i++) {
      if (result[i] === 'correct') continue;
      for (let j = 0; j < currentWord.length; j++) {
        if (!used[j] && guess[i] === wordLetters[j]) {
          result[i] = 'present';
          used[j] = true;
          break;
        }
      }
    }

    return result;
  }

  function handleKey(key) {
    if (gameOver) return;

    if (key === 'Enter') {
      submitGuess();
    } else if (key === 'Backspace') {
      currentGuess = currentGuess.slice(0, -1);
      renderBoard();
    } else if (/^[a-z]$/i.test(key) && key.length === 1) {
      // On first guess, allow typing up to reasonable length if length unknown
      const maxLen = lengthRevealed ? currentWord.length : 15;
      if (currentGuess.length < maxLen) {
        currentGuess += key.toLowerCase();
        renderBoard();
      }
    }
  }

  function submitGuess() {
    if (currentGuess.length === 0) {
      showMessage('Type your spelling!');
      shakeCurrentRow();
      return;
    }

    if (lengthRevealed && currentGuess.length !== currentWord.length) {
      showMessage(`The word has ${currentWord.length} letters!`);
      shakeCurrentRow();
      return;
    }

    const guess = currentGuess.toLowerCase();
    guesses.push(guess);

    // Update keyboard colors
    const result = evaluateGuess(guess);
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const state = result[i];
      // Only upgrade key state (absent < present < correct)
      if (!keyStates[letter] ||
          (keyStates[letter] === 'absent' && (state === 'present' || state === 'correct')) ||
          (keyStates[letter] === 'present' && state === 'correct')) {
        keyStates[letter] = state;
      }
    }

    guessNumber++;
    currentGuess = '';

    // Reveal length after first guess
    if (!lengthRevealed) {
      lengthRevealed = true;
      showLengthHint();
    }

    // Check for win
    if (guess === currentWord) {
      gameOver = true;
      renderBoard();
      updateKeyboard();
      revealTiles(guessNumber - 1, () => {
        showWin(guessNumber);
      });
      return;
    }

    // Check for loss
    if (guessNumber >= MAX_GUESSES) {
      gameOver = true;
      renderBoard();
      updateKeyboard();
      revealTiles(guessNumber - 1, () => {
        showLoss();
      });
      return;
    }

    renderBoard();
    updateKeyboard();
    revealTiles(guessNumber - 1);
  }

  function revealTiles(rowIndex, callback) {
    const row = document.getElementById(`row-${rowIndex}`);
    if (!row) {
      if (callback) callback();
      return;
    }

    const tiles = row.querySelectorAll('.tile');
    let delay = 0;

    tiles.forEach((tile, i) => {
      setTimeout(() => {
        tile.classList.add('reveal');
      }, delay);
      delay += 150;
    });

    if (callback) {
      setTimeout(callback, delay + 200);
    }
  }

  function showWin(attempts) {
    Storage.recordAttempt(currentWord, attempts, true);

    const messages = [
      'Genius!', 'Magnificent!', 'Impressive!',
      'Splendid!', 'Great!', 'Phew!'
    ];

    document.getElementById('result-icon').textContent = '\u{1F31F}';
    document.getElementById('result-title').textContent = messages[attempts - 1] || 'Well done!';
    document.getElementById('result-message').textContent =
      attempts === 1 ? 'You got it on the first try!' : `You got it in ${attempts} tries!`;
    document.getElementById('result-word').textContent = currentWord;
    document.getElementById('game-result').classList.remove('hidden');

    // Show next word button
    const btns = document.querySelector('.result-buttons');
    btns.children[0].classList.remove('hidden');

    // Celebration!
    Confetti.launch();
    TTS.speakEncouragement('Great job!');
  }

  function showLoss() {
    Storage.recordAttempt(currentWord, MAX_GUESSES, false);

    document.getElementById('result-icon').textContent = '\u{1F4AA}';
    document.getElementById('result-title').textContent = "Let's keep trying!";
    document.getElementById('result-message').textContent =
      'The word was:';
    document.getElementById('result-word').textContent = currentWord;
    document.getElementById('game-result').classList.remove('hidden');

    // Show next word button
    const btns = document.querySelector('.result-buttons');
    btns.children[0].classList.remove('hidden');

    TTS.speakEncouragement(`The word was ${currentWord}. You'll get it next time!`);
  }

  function hideResult() {
    document.getElementById('game-result').classList.add('hidden');
  }

  function showMessage(msg) {
    document.getElementById('game-message').textContent = msg;
    setTimeout(clearMessage, 2500);
  }

  function clearMessage() {
    document.getElementById('game-message').textContent = '';
  }

  function showLengthHint() {
    const hint = document.getElementById('game-length-hint');
    hint.textContent = `This word has ${currentWord.length} letters`;
    hint.classList.remove('hidden');
  }

  function hideLengthHint() {
    document.getElementById('game-length-hint').classList.add('hidden');
  }

  function shakeCurrentRow() {
    const row = document.getElementById(`row-${guessNumber}`);
    if (row) {
      row.classList.add('shake');
      setTimeout(() => row.classList.remove('shake'), 500);
    }
  }

  function updateKeyboard() {
    document.querySelectorAll('.key').forEach(key => {
      const letter = key.dataset.key;
      if (letter && letter.length === 1) {
        key.classList.remove('correct', 'present', 'absent');
        if (keyStates[letter]) {
          key.classList.add(keyStates[letter]);
        }
      }
    });
  }

  function updateWordCount() {
    const el = document.getElementById('game-word-count');
    el.textContent = `Word ${wordCount} of ${totalWordsInSession}`;
  }

  // === Keyboard Event Listeners ===

  function setupKeyboard() {
    // On-screen keyboard
    document.getElementById('keyboard').addEventListener('click', (e) => {
      const key = e.target.closest('.key');
      if (!key) return;
      const k = key.dataset.key;
      handleKey(k);
    });

    // Physical keyboard
    document.addEventListener('keydown', (e) => {
      // Only handle if game screen is active
      if (!document.getElementById('screen-game').classList.contains('active')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleKey('Enter');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKey('Backspace');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toLowerCase());
      }
    });
  }

  // Init keyboard on load
  document.addEventListener('DOMContentLoaded', setupKeyboard);

  return {
    init,
    nextWord,
    speakWord,
    handleKey,
  };
})();

/**
 * Simple confetti animation for celebrations.
 */
const Confetti = (() => {
  function launch() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6aaa64', '#c9b458', '#4a90d9', '#ec4899', '#8b5cf6', '#f59e0b'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.3,
        life: 1,
      });
    }

    let frame = 0;
    const maxFrames = 120;

    function animate() {
      if (frame >= maxFrames) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life = Math.max(0, 1 - frame / maxFrames);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      frame++;
      requestAnimationFrame(animate);
    }

    animate();
  }

  return { launch };
})();
