// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { serializeState, parseImport } from '../js/io.js';
import { createEmptyState } from '../js/state.js';

describe('serializeState', () => {
  it('produces parseable JSON', () => {
    const s = { ...createEmptyState(), entries: ['Alice'] };
    const json = serializeState(s);
    expect(JSON.parse(json).entries).toEqual(['Alice']);
  });
});

describe('parseImport', () => {
  it('round-trips a valid state', () => {
    const s = { ...createEmptyState(), entries: ['Alice', 'Bob'] };
    const result = parseImport(serializeState(s));
    expect(result.ok).toBe(true);
    expect(result.state.entries).toEqual(['Alice', 'Bob']);
  });

  it('rejects malformed JSON', () => {
    const result = parseImport('not json');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid json/i);
  });

  it('rejects wrong version', () => {
    const result = parseImport(JSON.stringify({ version: 99, entries: [], prizes: [] }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/version/i);
  });

  it('rejects missing required fields', () => {
    const result = parseImport(JSON.stringify({ version: 1 }));
    expect(result.ok).toBe(false);
  });
});
