// Tests only. The real app uses the browser's native localStorage.
// jsdom 25 in this Vitest build ships a stubbed `localStorage` without the
// Storage API methods (getItem, setItem, removeItem, clear). Replace it with
// a spec-compliant Map-backed implementation so tests can exercise the save/
// load code paths exactly as the browser would.
const store = new Map();
const storage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  writable: true,
  configurable: true,
});
