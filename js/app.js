import { loadState } from './state.js';
import { initSetup } from './setup.js';
import { initLive, syncLive } from './live.js';

const state = loadState();
let liveStarted = false;

function hasSetup() {
  return state.entries.length > 0 && state.prizes.length > 0;
}

function updateNavState() {
  const liveTab = document.querySelector('.view-toggle button[data-view="live"]');
  if (liveTab) {
    liveTab.disabled = !hasSetup();
    liveTab.title = hasSetup() ? '' : 'Add contestants and prizes in Setup first';
  }
}

function switchView(view) {
  if (view === 'live' && !hasSetup()) {
    return; // Guard: can't open Live without setup.
  }
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
  onStateChange: updateNavState,
});

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

updateNavState();

// Resume mid-event: if winners exist and prizes remain, land on Live view.
if (
  state.winners.length > 0 &&
  state.currentPrizeIndex < state.prizes.length
) {
  switchView('live');
}
