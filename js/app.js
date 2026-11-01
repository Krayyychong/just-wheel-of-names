import { loadState } from './state.js';
import { initSetup } from './setup.js';
import { initLive, syncLive } from './live.js';

const state = loadState();
let liveStarted = false;

function switchView(view) {
  document.body.className = 'view-' + view;
  document.querySelectorAll('.view-toggle button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  if (view === 'live') {
    if (!liveStarted) {
      initLive(state);
      liveStarted = true;
    } else {
      syncLive(state);
    }
  }
}

initSetup(state, {
  onStart: () => switchView('live'),
});

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Resume mid-event: if winners exist and prizes remain, land on Live view.
if (
  state.winners.length > 0 &&
  state.currentPrizeIndex < state.prizes.length
) {
  switchView('live');
}
