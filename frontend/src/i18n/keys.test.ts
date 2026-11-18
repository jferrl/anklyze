import { describe, it, expect } from 'vitest';
import en from './en.json';
import es from './es.json';

function keysOf(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    value !== null && typeof value === 'object' ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}

describe('translations', () => {
  it('en.json and es.json have identical key sets', () => {
    expect(keysOf(es).sort()).toEqual(keysOf(en).sort());
  });
});
