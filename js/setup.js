import {
  createEmptyState,
  validateConfig,
  saveState,
  debouncedSave,
} from './state.js';
import { downloadStateAsFile, pickFile, parseImport } from './io.js';

let state;
let onStartEvent;

export function initSetup(initialState, { onStart }) {
  state = initialState;
  onStartEvent = onStart;

  wireEntriesInput();
  wireModeTabs();
  wireAddPrize();
  wireJsonButtons();
  wireClear();

  renderAll();
}

/* ---------- Entries ---------- */

function wireEntriesInput() {
  const textarea = document.getElementById('entries-input');
  textarea.value = state.entries.join('\n');
  textarea.addEventListener('input', () => {
    const mode = currentMode();
    if (mode === 'csv') {
      refreshCsvPicker(textarea.value);
      state.entries = parseCsv(textarea.value, currentCsvColumn());
    } else {
      state.entries = parseNames(textarea.value);
    }
    renderAll();
    debouncedSave(state);
  });
}

function wireModeTabs() {
  document.querySelectorAll('.mode-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-tabs button').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      const isCsv = btn.dataset.mode === 'csv';
      document.getElementById('csv-picker').hidden = !isCsv;
      // Re-parse with the new mode
      const textarea = document.getElementById('entries-input');
      textarea.dispatchEvent(new Event('input'));
    });
  });

  // When the user picks a different column, re-parse the contestant list from
  // that column and re-render the prize cards so their preset-winner dropdowns
  // reflect the updated contestants.
  document.getElementById('csv-column').addEventListener('change', () => {
    const text = document.getElementById('entries-input').value;
    state.entries = parseCsv(text, currentCsvColumn());
    renderAll();
    debouncedSave(state);
  });
}

function currentMode() {
  return document.querySelector('.mode-tabs button.on')?.dataset.mode || 'names';
}

function currentCsvColumn() {
  const sel = document.getElementById('csv-column');
  return sel ? Number(sel.value) : 0;
}

function parseNames(text) {
  const seen = new Set();
  const out = [];
  for (const raw of text.split('\n')) {
    const name = raw.trim();
    if (!name) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function parseCsv(text, columnIndex) {
  const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(text);
  const rows = lines.map((line) => line.split(delimiter).map((c) => c.trim()));
  const startIdx = looksLikeHeader(rows[0]) ? 1 : 0;
  const seen = new Set();
  const out = [];
  for (let i = startIdx; i < rows.length; i++) {
    const name = (rows[i][columnIndex] || '').trim();
    if (!name) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function detectDelimiter(text) {
  // Pick whichever delimiter appears most in the first line. Tabs are most
  // common when pasting from Excel/Sheets; commas when pasting a CSV file.
  const firstLine = text.split('\n')[0] || '';
  const counts = {
    '\t': (firstLine.match(/\t/g) || []).length,
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
}

function looksLikeHeader(row) {
  // All cells look like a label (no numeric-only cells; most contain letters)
  return row.every((c) => /[a-zA-Z]/.test(c)) && row.length > 1;
}

function refreshCsvPicker(text) {
  const picker = document.getElementById('csv-column');
  const firstLine = text.split('\n')[0] || '';
  const delimiter = detectDelimiter(text);
  const cells = firstLine.split(delimiter).map((c) => c.trim());
  const current = picker.value;
  picker.innerHTML = '';
  cells.forEach((cell, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = cell || `Column ${idx + 1}`;
    picker.appendChild(opt);
  });
  if (current && picker.querySelector(`option[value="${current}"]`)) {
    picker.value = current;
  }
}

/* ---------- Prizes ---------- */

function wireAddPrize() {
  document.getElementById('add-prize').addEventListener('click', () => {
    state.prizes.push({
      id: 'p' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
      label: '',
      mode: 'random',
      winner: null,
    });
    renderAll();
    debouncedSave(state);
  });
}

function renderPrizes() {
  const list = document.getElementById('prize-list');
  list.innerHTML = '';
  state.prizes.forEach((prize, idx) => {
    list.appendChild(buildPrizeCard(prize, idx));
  });
}

function buildPrizeCard(prize, idx) {
  const card = document.createElement('div');
  card.className = 'prize' + (prize.mode === 'manual' ? ' manual' : '');

  const num = document.createElement('div');
  num.className = 'num';
  num.textContent = String(idx + 1);
  card.appendChild(num);

  const body = document.createElement('div');
  body.className = 'prize-body';

  const labelInput = document.createElement('input');
  labelInput.placeholder = 'Label (optional) — e.g. iPad';
  labelInput.value = prize.label || '';
  labelInput.addEventListener('input', (e) => {
    prize.label = e.target.value;
    debouncedSave(state);
  });
  body.appendChild(labelInput);

  if (prize.mode === 'manual') {
    const picker = document.createElement('select');
    if (state.entries.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = '(add contestants first)';
      opt.disabled = true;
      picker.appendChild(opt);
    } else {
      state.entries.forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = '★ ' + name;
        if (name === prize.presetWinner) opt.selected = true;
        picker.appendChild(opt);
      });
      // If presetWinner isn't set yet, default to the first
      if (!prize.presetWinner) {
        prize.presetWinner = state.entries[0];
      }
    }
    picker.addEventListener('change', (e) => {
      prize.presetWinner = e.target.value;
      renderValidation();
      debouncedSave(state);
    });
    body.appendChild(picker);
  }

  card.appendChild(body);

  const toggle = document.createElement('div');
  toggle.className = 'toggle-pill';
  const randomBtn = document.createElement('button');
  randomBtn.className = 'toggle-random' + (prize.mode === 'random' ? ' on' : '');
  randomBtn.textContent = 'Random';
  randomBtn.addEventListener('click', () => {
    prize.mode = 'random';
    delete prize.presetWinner;
    renderAll();
    debouncedSave(state);
  });
  const manualBtn = document.createElement('button');
  manualBtn.className = 'toggle-manual' + (prize.mode === 'manual' ? ' on' : '');
  manualBtn.textContent = 'Manual';
  manualBtn.addEventListener('click', () => {
    prize.mode = 'manual';
    if (!prize.presetWinner && state.entries.length > 0) {
      prize.presetWinner = state.entries[0];
    }
    renderAll();
    debouncedSave(state);
  });
  toggle.appendChild(randomBtn);
  toggle.appendChild(manualBtn);
  card.appendChild(toggle);

  const remove = document.createElement('button');
  remove.className = 'remove-prize';
  remove.title = 'Remove prize';
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    state.prizes.splice(idx, 1);
    renderAll();
    debouncedSave(state);
  });
  card.appendChild(remove);

  return card;
}

/* ---------- Validation ---------- */

function renderValidation() {
  const r = validateConfig(state);
  const el = document.getElementById('validation-errors');
  if (r.ok) {
    el.hidden = true;
    el.innerHTML = '';
  } else {
    el.hidden = false;
    el.innerHTML = r.errors.map((e) => `<div>⚠ ${escapeHtml(e)}</div>`).join('');
  }
  renderFooterActions();
}

/* ---------- JSON tools ---------- */

function wireJsonButtons() {
  document.getElementById('export-btn').addEventListener('click', () => {
    const name = (state.eventName || 'event').replace(/\s+/g, '-').toLowerCase() || 'event';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadStateAsFile(state, `pickwheel-${name}-${date}.json`);
  });

  document.getElementById('import-btn').addEventListener('click', async () => {
    const text = await pickFile();
    if (!text) return;
    const r = parseImport(text);
    if (!r.ok) {
      alert('Import failed: ' + r.error);
      return;
    }
    state = r.state;
    saveState(state);
    location.reload();
  });
}

function wireClear() {
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (!confirm('This will erase all entries, prizes, and recorded winners. Continue?')) return;
    state = createEmptyState();
    saveState(state);
    location.reload();
  });
}

/* ---------- Start event ---------- */

function eventStatus() {
  const prizeCount = state.prizes.length;
  const idx = state.currentPrizeIndex;
  const hasWinners = state.winners.length > 0;
  if (prizeCount === 0) return 'empty';
  if (!hasWinners && idx === 0) return 'fresh';
  if (idx >= prizeCount) return 'completed';
  return 'in-progress';
}

function startFresh() {
  state.currentPrizeIndex = 0;
  state.winners = [];
  state.prizes.forEach((p) => (p.winner = null));
  saveState(state);
  onStartEvent(state);
}

function resume() {
  saveState(state);
  onStartEvent(state);
}

function renderFooterActions() {
  const container = document.getElementById('footer-actions');
  container.innerHTML = '';
  const r = validateConfig(state);
  const canRun = r.ok && state.entries.length > 0 && state.prizes.length > 0;
  const status = eventStatus();

  if (status === 'in-progress') {
    container.appendChild(
      makeBtn('Resume Event →', 'btn-go-live', canRun, resume)
    );
    container.appendChild(
      makeBtn('Start Over', 'btn-restart', canRun, confirmAndStartOver)
    );
  } else if (status === 'completed') {
    container.appendChild(
      makeBtn('Start Over →', 'btn-go-live', canRun, confirmAndStartOver)
    );
  } else {
    container.appendChild(
      makeBtn('Start Event →', 'btn-go-live', canRun, startFresh)
    );
  }
}

function makeBtn(label, cls, enabled, onClick) {
  const btn = document.createElement('button');
  btn.className = cls;
  btn.textContent = label;
  btn.disabled = !enabled;
  btn.addEventListener('click', () => {
    const r = validateConfig(state);
    if (!r.ok) {
      renderValidation();
      return;
    }
    onClick();
  });
  return btn;
}

function confirmAndStartOver() {
  const ok = confirm(
    'This will clear all drawn winners and restart the event from Prize 1. ' +
    'Your contestants and prize setup will be kept. Continue?'
  );
  if (!ok) return;
  startFresh();
}

/* ---------- Shared rendering ---------- */

function renderAll() {
  document.getElementById('entry-count').textContent = state.entries.length;
  renderPrizes();
  renderValidation();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
