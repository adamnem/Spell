/**
 * OCR module - handles image upload, bulk entry, and text extraction.
 */
const OCR = (() => {
  let tesseractLoaded = false;

  function loadTesseract() {
    return new Promise((resolve, reject) => {
      if (tesseractLoaded && window.Tesseract) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = () => {
        tesseractLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
      document.head.appendChild(script);
    });
  }

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('ocr-preview');
    const previewImg = document.getElementById('ocr-image');
    const reader = new FileReader();

    reader.onload = (e) => {
      previewImg.src = e.target.result;
      preview.classList.remove('hidden');
      processImage(e.target.result);
    };

    reader.readAsDataURL(file);
  }

  async function processImage(imageData) {
    const status = document.getElementById('ocr-status');
    const statusText = document.getElementById('ocr-status-text');

    status.classList.remove('hidden');
    statusText.textContent = 'Loading OCR engine...';

    try {
      await loadTesseract();

      statusText.textContent = 'Reading words from image...';

      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            statusText.textContent = `Reading... ${pct}%`;
          }
        },
      });

      const text = result.data.text;
      const words = extractWords(text);

      status.classList.add('hidden');

      if (words.length === 0) {
        App.showToast('No words found. Try again or type them manually.');
        return;
      }

      showEditStep(words);
    } catch (err) {
      status.classList.add('hidden');
      App.showToast('Error reading image. Please try again or type words manually.');
    }
  }

  function extractWords(text) {
    const raw = text.split(/[\s,;:\-\d.()[\]]+/);
    return raw
      .map(w => w.replace(/[^a-zA-Z']/g, '').trim())
      .filter(w => w.length >= 2 && w.length <= 15)
      .map(w => w.toLowerCase())
      .filter((w, i, arr) => arr.indexOf(w) === i);
  }

  function showManualEntry() {
    showEditStep([]);
  }

  function showBulkEntry() {
    _hideAllSteps();
    document.getElementById('upload-step-bulk').classList.remove('hidden');
    document.getElementById('bulk-words-input').value = '';
    document.getElementById('bulk-words-input').focus();
  }

  function processBulkEntry() {
    const text = document.getElementById('bulk-words-input').value;
    const words = text
      .split(/[\n,;]+/)
      .map(w => w.replace(/[^a-zA-Z']/g, '').trim().toLowerCase())
      .filter(w => w.length >= 1)
      .filter((w, i, arr) => arr.indexOf(w) === i);

    if (words.length === 0) {
      App.showToast('No words found. Please enter at least one word.');
      return;
    }

    showEditStep(words);
  }

  function showEditStep(words) {
    _hideAllSteps();
    document.getElementById('upload-step-2').classList.remove('hidden');

    const list = document.getElementById('word-edit-list');
    list.innerHTML = '';

    if (words.length === 0) {
      for (let i = 0; i < 5; i++) {
        addWordField('');
      }
    } else {
      words.forEach(w => addWordField(w));
    }

    // Set default test date to next Friday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    document.getElementById('week-date').valueAsDate = nextFriday;
  }

  function _hideAllSteps() {
    document.getElementById('upload-step-1').classList.add('hidden');
    document.getElementById('upload-step-bulk').classList.add('hidden');
    document.getElementById('upload-step-2').classList.add('hidden');
  }

  function addWordField(value) {
    const list = document.getElementById('word-edit-list');
    const item = document.createElement('div');
    item.className = 'word-edit-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = 'Type a word...';
    input.autocapitalize = 'none';
    input.autocomplete = 'off';
    input.spellcheck = false;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'word-remove-btn';
    removeBtn.textContent = '\u2715';
    removeBtn.onclick = () => item.remove();

    item.appendChild(input);
    item.appendChild(removeBtn);
    list.appendChild(item);

    if (!value) input.focus();
  }

  function saveWordList() {
    const inputs = document.querySelectorAll('#word-edit-list input');
    const words = [];

    inputs.forEach(input => {
      const word = input.value.trim().toLowerCase();
      if (word.length >= 1) {
        words.push(word);
      }
    });

    if (words.length === 0) {
      App.showToast('Please add at least one word.');
      return;
    }

    const listLabel = document.getElementById('week-label').value.trim() || '';
    const testDate = document.getElementById('week-date').value || '';

    const listId = `list-${Date.now()}`;

    const wordList = {
      id: listId,
      weekNumber: null,
      label: listLabel || null,
      date: null,
      testDate: testDate || null,
      words: words,
      tags: {},
      defaultTag: null,
      createdAt: new Date().toISOString(),
      isBuiltIn: false,
    };

    Storage.saveWordList(wordList);

    App.showToast(`Saved ${words.length} words!`);

    resetUploadForm();

    setTimeout(() => App.navigate('menu'), 800);
  }

  function resetUploadForm() {
    document.getElementById('upload-step-1').classList.remove('hidden');
    document.getElementById('upload-step-bulk').classList.add('hidden');
    document.getElementById('upload-step-2').classList.add('hidden');
    document.getElementById('ocr-preview').classList.add('hidden');
    document.getElementById('ocr-status').classList.add('hidden');
    document.getElementById('file-input').value = '';
    document.getElementById('word-edit-list').innerHTML = '';
    document.getElementById('week-label').value = '';
    document.getElementById('week-date').value = '';
  }

  return {
    handleFileSelect,
    showManualEntry,
    showBulkEntry,
    processBulkEntry,
    addWordField,
    saveWordList,
    resetUploadForm,
  };
})();
