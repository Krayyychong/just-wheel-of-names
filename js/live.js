import {
  eligibleForRandomSpin,
  pickRandomWinner,
  saveState,
} from './state.js';
import { renderWheel, spinTo, resetWheel } from './wheel.js';

let state;
let spinning = false;

export function initLive(initialState) {
  state = initialState;

  document.getElementById('spin-btn').addEventListener('click', onSpin);
  document.getElementById('next-prize-btn').addEventListener('click', onNext);

  renderCurrent();
}

function currentPrize() {
  return state.prizes[state.currentPrizeIndex];
}

function computeCurrentPool(prizeIndex) {
  // The wheel always shows every contestant who hasn't yet won. Preset winners
  // for later Manual prizes stay visible — otherwise the audience would notice
  // names missing from the wheel. The random-pick filter is applied separately
  // when actually choosing a winner.
  const winnersSet = new Set(state.winners);
  return state.entries.filter((n) => !winnersSet.has(n));
}

function renderCurrent() {
  const idx = state.currentPrizeIndex;
  const prize = currentPrize();

  if (state.prizes.length === 0 || state.entries.length === 0) {
    renderNoSetup();
    return;
  }
  if (!prize) {
    renderEventComplete();
    return;
  }

  document.getElementById('progress-pill').textContent =
    `PRIZE ${idx + 1} OF ${state.prizes.length}`;
  document.getElementById('prize-tag').textContent = 'Up Next';
  document.getElementById('prize-tag').hidden = false;
  document.getElementById('prize-name').textContent =
    prize.label || `Prize ${idx + 1}`;
  document.querySelector('.pointer').hidden = false;

  const pool = computeCurrentPool(idx);
  document.getElementById('pool-count').textContent = pool.length;

  const svg = document.getElementById('wheel-svg');
  resetWheel(svg);
  renderWheel(svg, pool);

  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = pool.length === 0;
  spinBtn.textContent = 'SPIN';

  document.getElementById('winner-dialog').hidden = true;
}

function renderNoSetup() {
  document.getElementById('progress-pill').textContent = 'NO SETUP YET';
  document.getElementById('prize-tag').hidden = true;
  document.getElementById('prize-name').textContent =
    'Add contestants and prizes in Setup first';

  document.getElementById('wheel-svg').innerHTML = '';
  document.querySelector('.pointer').hidden = true;
  document.getElementById('pool-count').textContent = state.entries.length;

  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = false;
  spinBtn.textContent = 'GO TO SETUP';
  document.getElementById('winner-dialog').hidden = true;
}

function renderEventComplete() {
  document.getElementById('progress-pill').textContent =
    `ALL ${state.prizes.length} PRIZES AWARDED`;
  document.getElementById('prize-tag').textContent = 'Event Complete';
  document.getElementById('prize-tag').hidden = false;
  document.getElementById('prize-name').textContent = '🎉 Thanks for playing';
  document.querySelector('.pointer').hidden = true;
  document.getElementById('wheel-svg').innerHTML = '';
  document.getElementById('pool-count').textContent =
    state.entries.length - state.winners.length;

  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = true;
  spinBtn.textContent = 'DONE';
  document.getElementById('winner-dialog').hidden = true;
}

async function onSpin() {
  if (spinning) return;
  // No-setup state: button acts as "Go to Setup" shortcut.
  if (state.prizes.length === 0 || state.entries.length === 0) {
    document.querySelector('[data-view="setup"]').click();
    return;
  }
  const idx = state.currentPrizeIndex;
  const prize = currentPrize();
  if (!prize) return;

  const pool = computeCurrentPool(idx);
  if (pool.length === 0) {
    alert('No eligible contestants in the pool.');
    return;
  }

  let winner;
  try {
    winner = prize.mode === 'manual'
      ? prize.presetWinner
      : pickRandomWinner(state, idx);
  } catch (err) {
    alert(err.message);
    return;
  }

  const targetIndex = pool.indexOf(winner);
  if (targetIndex === -1) {
    alert(`Internal error: winner "${winner}" is not in the current pool. Check the setup.`);
    return;
  }

  spinning = true;
  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = true;

  const svg = document.getElementById('wheel-svg');
  await spinTo(svg, targetIndex, pool.length);

  prize.winner = winner;
  state.winners.push(winner);
  saveState(state);

  showWinnerDialog(prize, winner);
  spinning = false;
}

function showWinnerDialog(prize, winner) {
  const idx = state.currentPrizeIndex;
  const isFinal = idx === state.prizes.length - 1;

  document.getElementById('dialog-prize').textContent =
    prize.label || `Prize ${idx + 1}`;
  document.getElementById('dialog-winner').textContent = winner;

  const nextBtn = document.getElementById('next-prize-btn');
  nextBtn.textContent = isFinal ? 'Finish Event' : 'Next Prize →';
  nextBtn.classList.toggle('final', isFinal);

  document.getElementById('winner-dialog').hidden = false;
}

function onNext() {
  state.currentPrizeIndex += 1;
  saveState(state);
  renderCurrent();
}

// Called from the view toggle when the user switches back to Live after
// editing in Setup — re-syncs the DOM with current state.
export function syncLive(nextState) {
  state = nextState;
  renderCurrent();
}
