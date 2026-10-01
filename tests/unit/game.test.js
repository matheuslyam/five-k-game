import { describe, it, expect } from 'vitest';
import { normalizeGuess, stripFlagFormat, normalizeAnswer, isValidShape, fragsToKey } from '../../src/game.js';

describe('normalize', () => {
  it('trim + lowercase', () => {
    expect(normalizeGuess('  ArGon2 ')).toBe('argon2');
  });
  it('aceita 5k{...} e variações de case', () => {
    expect(normalizeAnswer('5k{argon2}')).toBe('argon2');
    expect(normalizeAnswer(' 5K{Argon2} ')).toBe('argon2');
    expect(normalizeAnswer('argon2')).toBe('argon2');
  });
  it('strip só remove um nível', () => {
    expect(stripFlagFormat('5k{bem-vindo}')).toBe('bem-vindo');
    expect(stripFlagFormat('plano')).toBe('plano');
  });
  it('shape 1-100', () => {
    expect(isValidShape('')).toBe(false);
    expect(isValidShape('a')).toBe(true);
    expect(isValidShape('x'.repeat(101))).toBe(false);
  });
  it('fragsToKey monta chave final', () => {
    expect(fragsToKey([' A ', 'B', 'c', 'D '])).toBe('a-b-c-d');
  });
});
