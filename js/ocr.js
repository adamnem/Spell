/**
 * OCR module - handles image upload and text extraction using Tesseract.js.
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

    // Show preview
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

  /**
   * Extract individual words from OCR text output.
   * Filters for reasonable spelling words (alphabetic, 2-15 characters).
   */
  function extractWords(text) {
    // Split by whitespace, newlines, commas, numbers/bullets
    const raw = text.split(/[\s,;:\-\d.()[\]]+/);

    return raw
      .map(w => w.replace(/[^a-zA-Z']/g, '').trim()) // Keep only letters and apostrophes
      .filter(w => w.length >= 2 && w.length <= 15) // Reasonable word length
      .map(w => w.toLowerCase())
      .filter((w, i, arr) => arr.indexOf(w) === i); // Deduplicate
  }

  function showManualEntry() {
    showEditStep([]);
  }

  function showEditStep(words) {
    document.getElementById('upload-step-1').classList.add('hidden');
    document.getElementById('upload-step-2').classList.remove('hidden');

    const list = document.getElementById('word-edit-list');
    list.innerHTML = '';

    if (words.length === 0) {
      // Start with a few empty fields
      for (let i = 0; i < 5; i++) {
        addWordField('');
      }
    } else {
      words.forEach(w => addWordField(w));
    }

    // Set default week date to today
    document.getElementById('week-date').valueAsDate = new Date();
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

    const weekNumber = document.getElementById('week-number').value || '';
    const weekDate = document.getElementById('week-date').value || new Date().toISOString().split('T')[0];

    const listId = `week-${weekNumber || 'x'}-${Date.now()}`;

    const wordList = {
      id: listId,
      weekNumber: parseInt(weekNumber) || null,
      date: weekDate,
      words: words,
      createdAt: new Date().toISOString(),
    };

    Storage.saveWordList(wordList);

    App.showToast(`Saved ${words.length} words!`);

    // Reset upload form
    resetUploadForm();

    // Navigate to menu
    setTimeout(() => App.navigate('menu'), 800);
  }

  function resetUploadForm() {
    document.getElementById('upload-step-1').classList.remove('hidden');
    document.getElementById('upload-step-2').classList.add('hidden');
    document.getElementById('ocr-preview').classList.add('hidden');
    document.getElementById('ocr-status').classList.add('hidden');
    document.getElementById('file-input').value = '';
    document.getElementById('word-edit-list').innerHTML = '';
    document.getElementById('week-number').value = '';
    document.getElementById('week-date').value = '';
  }

  return {
    handleFileSelect,
    showManualEntry,
    addWordField,
    saveWordList,
    resetUploadForm,
  };
})();
