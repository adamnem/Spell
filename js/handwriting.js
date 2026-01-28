/**
 * Handwriting input module - canvas-based drawing with recognition.
 * Uses Google Input Tools API for handwriting recognition.
 * Supports finger, Apple Pencil, and stylus via Pointer Events.
 */
const Handwriting = (() => {
  let canvas = null;
  let ctx = null;
  let isDrawing = false;
  let strokes = [];
  let currentStroke = null;
  let recognizeTimer = null;
  let recognizedText = '';
  let altCandidates = [];
  let onSubmitCallback = null;

  const RECOGNIZE_DELAY = 800;
  const LINE_WIDTH = 3;
  const LINE_COLOR = '#1a1a2e';

  function init(canvasEl, submitCallback) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    onSubmitCallback = submitCallback;

    setupCanvas();
    setupEvents();
    setupAltClicks();
  }

  function setupCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = LINE_COLOR;

    drawGuideLines();
  }

  function drawGuideLines() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Bottom baseline
    ctx.beginPath();
    ctx.moveTo(10, h * 0.75);
    ctx.lineTo(w - 10, h * 0.75);
    ctx.stroke();

    // Middle dashed line
    ctx.beginPath();
    ctx.moveTo(10, h * 0.45);
    ctx.lineTo(w - 10, h * 0.45);
    ctx.stroke();

    ctx.restore();

    // Reset drawing style
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = LINE_COLOR;
  }

  function setupEvents() {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
  }

  function setupAltClicks() {
    const altEl = document.getElementById('hw-alternatives');
    if (altEl) {
      altEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.hw-alt-btn');
        if (!btn) return;
        const idx = parseInt(btn.dataset.idx);
        if (altCandidates[idx]) {
          pickAlternative(altCandidates[idx]);
        }
      });
    }
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: Date.now()
    };
  }

  function onPointerDown(e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    isDrawing = true;

    const pos = getPos(e);
    currentStroke = { xs: [pos.x], ys: [pos.y], ts: [pos.t] };

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    if (recognizeTimer) {
      clearTimeout(recognizeTimer);
      recognizeTimer = null;
    }
  }

  function onPointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();

    const pos = getPos(e);
    currentStroke.xs.push(pos.x);
    currentStroke.ys.push(pos.y);
    currentStroke.ts.push(pos.t);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentStroke && currentStroke.xs.length > 1) {
      strokes.push(currentStroke);
    }
    currentStroke = null;

    // Auto-recognize after a delay
    if (strokes.length > 0) {
      if (recognizeTimer) clearTimeout(recognizeTimer);
      recognizeTimer = setTimeout(() => {
        recognize();
      }, RECOGNIZE_DELAY);
    }
  }

  async function recognize() {
    if (strokes.length === 0) {
      updatePreview('');
      return;
    }

    const ink = strokes.map(s => [s.xs, s.ys, s.ts]);
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    const payload = JSON.stringify({
      options: 'enable_pre_space',
      requests: [{
        writing_guide: {
          writing_area_width: w,
          writing_area_height: h
        },
        ink: ink,
        pre_context: '',
        max_num_results: 5,
        max_completions: 0,
        language: 'en',
        input_type: 0
      }]
    });

    try {
      const resp = await fetch(
        'https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }
      );

      const data = await resp.json();

      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
        const candidates = data[1][0][1];
        recognizedText = candidates[0] || '';
        altCandidates = candidates.slice(1, 4);
        updatePreview(recognizedText, altCandidates);
      } else {
        updatePreview('');
      }
    } catch (err) {
      updatePreview('', null, true);
    }
  }

  function updatePreview(text, alternatives, offline) {
    const previewEl = document.getElementById('hw-preview');
    const altEl = document.getElementById('hw-alternatives');

    if (!previewEl) return;

    if (offline) {
      previewEl.textContent = 'Recognition requires internet';
      previewEl.className = 'hw-preview hw-preview-error';
      if (altEl) altEl.innerHTML = '';
      return;
    }

    if (text) {
      previewEl.textContent = text;
      previewEl.className = 'hw-preview hw-preview-active';

      if (altEl && alternatives && alternatives.length > 0) {
        altEl.innerHTML = alternatives.map((alt, i) =>
          '<button class="hw-alt-btn" data-idx="' + i + '">' +
          App.escapeHTML(alt) + '</button>'
        ).join('');
      } else if (altEl) {
        altEl.innerHTML = '';
      }
    } else {
      previewEl.textContent = 'Write the word above';
      previewEl.className = 'hw-preview';
      if (altEl) altEl.innerHTML = '';
    }
  }

  function pickAlternative(text) {
    recognizedText = text;
    const previewEl = document.getElementById('hw-preview');
    if (previewEl) {
      previewEl.textContent = text;
      previewEl.className = 'hw-preview hw-preview-active';
    }
  }

  function submit() {
    if (!recognizedText && strokes.length > 0) {
      // Try recognizing first
      recognize().then(() => {
        if (recognizedText && onSubmitCallback) {
          onSubmitCallback(recognizedText.toLowerCase().trim());
          clear();
        }
      });
      return;
    }

    if (recognizedText && onSubmitCallback) {
      onSubmitCallback(recognizedText.toLowerCase().trim());
    }
    clear();
  }

  function clear() {
    strokes = [];
    currentStroke = null;
    recognizedText = '';
    altCandidates = [];

    if (recognizeTimer) {
      clearTimeout(recognizeTimer);
      recognizeTimer = null;
    }

    if (ctx && canvas) {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      drawGuideLines();
    }

    updatePreview('');
  }

  function resize() {
    if (canvas) {
      setupCanvas();
      redrawStrokes();
    }
  }

  function redrawStrokes() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = LINE_COLOR;

    for (const stroke of strokes) {
      if (stroke.xs.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.xs[0], stroke.ys[0]);
      for (let i = 1; i < stroke.xs.length; i++) {
        ctx.lineTo(stroke.xs[i], stroke.ys[i]);
      }
      ctx.stroke();
    }
  }

  return {
    init,
    submit,
    clear,
    resize,
    pickAlternative,
  };
})();
