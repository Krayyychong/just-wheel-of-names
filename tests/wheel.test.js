// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { computeFinalRotation, segmentCenterAngle } from '../js/wheel.js';

describe('segmentCenterAngle', () => {
  it('places index 0 at half of first segment', () => {
    expect(segmentCenterAngle(0, 10)).toBeCloseTo(18);
  });
  it('places last index near end', () => {
    expect(segmentCenterAngle(9, 10)).toBeCloseTo(342);
  });
});

describe('computeFinalRotation', () => {
  it('lands within the target segment for every index across many trials', () => {
    const poolSize = 10;
    const segmentWidth = 360 / poolSize;
    for (let target = 0; target < poolSize; target++) {
      for (let trial = 0; trial < 50; trial++) {
        const rotation = computeFinalRotation(target, poolSize);
        const pointerAngleOnWheel = (360 - (rotation % 360) + 360) % 360;
        const segmentStart = target * segmentWidth;
        const segmentEnd = (target + 1) * segmentWidth;
        expect(pointerAngleOnWheel).toBeGreaterThanOrEqual(segmentStart);
        expect(pointerAngleOnWheel).toBeLessThan(segmentEnd);
      }
    }
  });

  it('produces at least 6 full turns of spin', () => {
    const rotation = computeFinalRotation(0, 10);
    expect(rotation).toBeGreaterThan(6 * 360);
  });

  it('is non-deterministic (jitter varies the result)', () => {
    const results = new Set();
    for (let i = 0; i < 50; i++) {
      results.add(computeFinalRotation(3, 10));
    }
    expect(results.size).toBeGreaterThan(10);
  });
});
