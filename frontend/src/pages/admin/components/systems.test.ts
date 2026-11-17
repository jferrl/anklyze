import { describe, expect, it } from 'vitest';
import { SYSTEM_KEYS, agreementColorClass, formatPercent, kappaAxisMin } from './systems';

describe('systems', () => {
  it('orders systems Lauge-Hansen first', () => {
    expect(SYSTEM_KEYS).toEqual(['lauge_hansen', 'danis_weber', 'ao_ota', 'bartonicek']);
  });

  it('prints percentages with one decimal', () => {
    expect(formatPercent(100)).toBe('100.0%');
    expect(formatPercent(66.666)).toBe('66.7%');
  });

  it('colours only values under 60', () => {
    expect(agreementColorClass(59.9)).toBe('text-warning');
    expect(agreementColorClass(60)).toBe('');
    expect(agreementColorClass(undefined)).toBe('');
  });

  it('widens the kappa axis only when a value or bound is negative', () => {
    expect(kappaAxisMin([0.68, 0.67, undefined, null])).toBe(0);
    expect(kappaAxisMin([0.68, -0.05])).toBe(-1);
  });
});
