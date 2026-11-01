export const STORAGE_KEY = 'pickwheel.state.v1';

export function createEmptyState() {
  return {
    version: 1,
    eventName: '',
    entries: [],
    prizes: [],
    winners: [],
    currentPrizeIndex: 0,
  };
}

export function validateConfig(state) {
  const errors = [];
  const entriesSet = new Set(state.entries);
  const manualPrizes = state.prizes.filter(p => p.mode === 'manual');

  for (const p of manualPrizes) {
    if (!entriesSet.has(p.presetWinner)) {
      errors.push(`Preset winner "${p.presetWinner}" is not in the contestant list.`);
    }
  }

  const presetSeen = new Set();
  for (const p of manualPrizes) {
    if (presetSeen.has(p.presetWinner)) {
      errors.push(`Duplicate preset winner "${p.presetWinner}" assigned to multiple prizes.`);
    }
    presetSeen.add(p.presetWinner);
  }

  const availableCount = state.entries.length - state.winners.length;
  const remainingPrizes = state.prizes.length - state.currentPrizeIndex;
  if (availableCount < remainingPrizes) {
    errors.push(`Not enough contestants: ${availableCount} available for ${remainingPrizes} prize(s).`);
  }

  return { ok: errors.length === 0, errors };
}

export function eligibleForRandomSpin(state, prizeIndex) {
  const futurePresets = new Set(
    state.prizes
      .slice(prizeIndex + 1)
      .filter(p => p.mode === 'manual')
      .map(p => p.presetWinner)
  );
  const winnersSet = new Set(state.winners);
  return state.entries.filter(
    name => !winnersSet.has(name) && !futurePresets.has(name)
  );
}

export function pickRandomWinner(state, prizeIndex) {
  const pool = eligibleForRandomSpin(state, prizeIndex);
  if (pool.length === 0) throw new Error('No eligible contestants for random spin');
  return pool[Math.floor(Math.random() * pool.length)];
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return createEmptyState();
    return parsed;
  } catch {
    return createEmptyState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let _saveTimer;
export function debouncedSave(state, delay = 300) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => saveState(state), delay);
}
