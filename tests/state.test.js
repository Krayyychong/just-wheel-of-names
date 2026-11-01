// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyState,
  validateConfig,
  eligibleForRandomSpin,
  pickRandomWinner,
  loadState,
  saveState,
  STORAGE_KEY,
} from '../js/state.js';

describe('createEmptyState', () => {
  it('returns a well-formed empty state', () => {
    const s = createEmptyState();
    expect(s.version).toBe(1);
    expect(s.entries).toEqual([]);
    expect(s.prizes).toEqual([]);
    expect(s.winners).toEqual([]);
    expect(s.currentPrizeIndex).toBe(0);
  });
});

describe('validateConfig', () => {
  const base = () => ({
    version: 1,
    entries: ['Alice', 'Bob', 'Charlie'],
    prizes: [
      { id: 'p1', label: '', mode: 'random', winner: null },
      { id: 'p2', label: 'iPad', mode: 'manual', presetWinner: 'Alice', winner: null },
    ],
    winners: [],
    currentPrizeIndex: 0,
  });

  it('passes a valid config', () => {
    expect(validateConfig(base()).ok).toBe(true);
  });

  it('fails when presetWinner is not in entries', () => {
    const s = base();
    s.prizes[1].presetWinner = 'Nobody';
    const r = validateConfig(s);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/preset winner/i);
  });

  it('fails when two manual prizes share a presetWinner', () => {
    const s = base();
    s.prizes.push({ id: 'p3', label: '', mode: 'manual', presetWinner: 'Alice', winner: null });
    const r = validateConfig(s);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/duplicate preset/i);
  });

  it('fails when prizes exceed available entries', () => {
    const s = base();
    s.prizes.push({ id: 'p3', label: '', mode: 'random', winner: null });
    s.prizes.push({ id: 'p4', label: '', mode: 'random', winner: null });
    const r = validateConfig(s);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/not enough contestants/i);
  });
});

describe('eligibleForRandomSpin', () => {
  it('excludes winners already drawn', () => {
    const s = {
      entries: ['Alice', 'Bob', 'Charlie'],
      prizes: [
        { id: 'p1', mode: 'random' },
        { id: 'p2', mode: 'random' },
      ],
      winners: ['Alice'],
      currentPrizeIndex: 1,
    };
    expect(eligibleForRandomSpin(s, 1)).toEqual(['Bob', 'Charlie']);
  });

  it('excludes preset winners of future manual prizes', () => {
    const s = {
      entries: ['Alice', 'Bob', 'Charlie'],
      prizes: [
        { id: 'p1', mode: 'random' },
        { id: 'p2', mode: 'manual', presetWinner: 'Charlie' },
      ],
      winners: [],
      currentPrizeIndex: 0,
    };
    expect(eligibleForRandomSpin(s, 0)).toEqual(['Alice', 'Bob']);
  });

  it('does NOT exclude preset winners of past manual prizes', () => {
    const s = {
      entries: ['Alice', 'Bob', 'Charlie'],
      prizes: [
        { id: 'p1', mode: 'manual', presetWinner: 'Alice' },
        { id: 'p2', mode: 'random' },
      ],
      winners: ['Alice'],
      currentPrizeIndex: 1,
    };
    expect(eligibleForRandomSpin(s, 1)).toEqual(['Bob', 'Charlie']);
  });
});

describe('pickRandomWinner', () => {
  it('always returns a name from the eligible pool', () => {
    const s = {
      entries: ['A', 'B', 'C', 'D'],
      prizes: [
        { id: 'p1', mode: 'random' },
        { id: 'p2', mode: 'manual', presetWinner: 'D' },
      ],
      winners: [],
      currentPrizeIndex: 0,
    };
    for (let i = 0; i < 200; i++) {
      const w = pickRandomWinner(s, 0);
      expect(['A', 'B', 'C']).toContain(w);
    }
  });
});

describe('persistence', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty state when nothing is stored', () => {
    const s = loadState();
    expect(s.entries).toEqual([]);
  });

  it('round-trips state through localStorage', () => {
    const s = { ...createEmptyState(), entries: ['Alice'] };
    saveState(s);
    const loaded = loadState();
    expect(loaded.entries).toEqual(['Alice']);
  });

  it('returns empty state if stored JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    const s = loadState();
    expect(s.entries).toEqual([]);
  });
});
