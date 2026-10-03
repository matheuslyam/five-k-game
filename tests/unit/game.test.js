import { describe, it, expect } from 'vitest';
import { normalizeGuess, stripFlagFormat, normalizeAnswer, isValidShape, fragsToKey, parseUnlockKey, parseRoute } from '../../src/game.js';

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

describe('parseUnlockKey', () => {
  const KEY = '3952b1dd16f28958-9663e00d1dc9955b-e9c557ef87e6ed39-310353b5a0da185d';
  it('aceita chave 4/4 em ordem', () => {
    const r = parseUnlockKey(KEY);
    expect(r.ok).toBe(true);
    expect(r.parts).toHaveLength(4);
  });
  it('aceita uppercase e espaços nas pontas', () => {
    expect(parseUnlockKey('  ' + KEY.toUpperCase() + '  ').ok).toBe(true);
  });
  it('rejeita parcial, hífen duplo e pontas', () => {
    expect(parseUnlockKey('a-b-c').ok).toBe(false);
    expect(parseUnlockKey('a-b-c-d-e').ok).toBe(false);
    expect(parseUnlockKey('a--c-d').ok).toBe(false);
    expect(parseUnlockKey('-a-b-c-d').ok).toBe(false);
    expect(parseUnlockKey('a-b-c-d-').ok).toBe(false);
    expect(parseUnlockKey('').ok).toBe(false);
  });
  it('rejeita espaço interno', () => {
    expect(parseUnlockKey('a-b -c-d').ok).toBe(false);
  });
});

describe('parseRoute', () => {
  it('mantém rotas válidas e cai no onboarding', () => {
    expect(parseRoute('#/flag-2')).toBe('#/flag-2');
    expect(parseRoute('#/carta')).toBe('#/carta');
    expect(parseRoute('#/x')).toBe('#/');
    expect(parseRoute('')).toBe('#/');
  });
});
