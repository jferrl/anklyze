import { describe, expect, it } from 'vitest';
import { formatDuration, formatKappa, formatNumber, formatPercent } from './format';

describe('number formatting', () => {
  it('prints kappa with two decimals in the interface language', () => {
    expect(formatKappa(0.384, 'en')).toBe('0.38');
    expect(formatKappa(0.384, 'es')).toBe('0,38');
    expect(formatKappa(-0.1, 'en')).toBe('−0.10');
    expect(formatKappa(-0.1, 'es')).toBe('−0,10');
  });

  it('prints percentages with one decimal and the locale sign', () => {
    expect(formatPercent(80, 'en')).toBe('80.0%');
    expect(formatPercent(66.666, 'es').replace(/\s/g, ' ')).toBe('66,7 %');
  });

  it('prints plain figures with fixed decimals', () => {
    expect(formatNumber(2.75, 1, 'en')).toBe('2.8');
    expect(formatNumber(2.75, 1, 'es')).toBe('2,8');
  });

  it('prints durations in seconds under a minute, else in minutes', () => {
    expect(formatDuration(45_400, 'en')).toBe('45 sec');
    expect(formatDuration(150_000, 'en')).toBe('2.5 min');
    expect(formatDuration(150_000, 'es')).toBe('2,5 min');
  });
});
