# Pickwheel

A browser-based prize wheel for live events, with per-prize preset winners that are invisible to the audience.

Random prizes pick a winner uniformly at random. Manual prizes land on a pre-chosen winner — same spin animation, same duration, same curve. From the audience's perspective the two are indistinguishable; only the planner knows the sequence was preset.

## Running locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8765
# then visit http://localhost:8765
```

## Tests

```bash
npm install
npm test
```

22 unit tests cover state, pool filtering, preset selection math, and JSON import/export.

## Features

- Paste contestants as names (one per line) or paste a CSV and pick the name column.
- Build a prize sequence; label each prize optionally.
- Toggle any prize to **Manual** and preset a winner. Preset prizes get an orange highlight *in the setup view only*.
- Autosave to `localStorage` — refresh the page without losing work.
- Export/Import the full event setup as JSON.
- Mid-event resume: a crash reopens exactly where the event left off.

## Hosting on GitHub Pages

1. Push the folder to a GitHub repo.
2. Repo Settings → Pages → Source: Deploy from branch `main`, folder `/ (root)`.
3. Visit `https://<username>.github.io/<repo>/`.

## How presets work

Both random and manual spins run the same animation:

1. Choose the winner before spinning (random pick for Random, preset for Manual).
2. Compute the final wheel rotation so the pointer lands within the winner's segment, with a small random jitter inside the segment so the pointer isn't always dead-center.
3. Animate the rotation over 5 seconds with an ease-out curve.

Random spins avoid picking anyone who is a preset winner of a later Manual prize — this guarantees every preset winner is still in the pool when their prize comes up, regardless of sequence order.

## Pre-event QA checklist

- [ ] Import a known-good setup JSON (or build one from scratch).
- [ ] Verify entry count matches expected.
- [ ] Confirm every Manual prize shows a ★ and the correct preset winner.
- [ ] Click through the full prize sequence on a laptop and check:
  - Winner dialog shows the correct prize and name.
  - "Next Prize →" advances to the next prize.
  - Final prize button says "Finish Event".
  - Preset winners landed on their intended prize (not earlier).
- [ ] Refresh the browser mid-sequence; confirm it resumes at the right prize.
- [ ] Clear All; confirm Setup view opens empty.

## Project structure

```
.
├── index.html              Markup for Setup + Live views
├── css/style.css           Playful theme
├── js/
│   ├── state.js            State object, validation, pool filtering, localStorage
│   ├── wheel.js            SVG wheel, spin animation, preset selection math
│   ├── io.js               Export/import JSON
│   ├── setup.js            Setup view controller
│   ├── live.js             Live view controller
│   └── app.js              Entry point
├── tests/                  Vitest + jsdom
├── docs/superpowers/       Design spec + implementation plan
└── README.md
```
