import { describe, it, expect } from 'vitest';
import { normalizeAnswer, sha256hex, timingEqualHex, timingEqualStr, parseUnlockKey, rateLimited, _resetBuckets } from '../../api/_lib.js';
import unlock from '../../api/unlock.js';

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(k, v) { this.headers[k] = v; },
    end(s) { this.body = s; }
  };
}

function mockReq(body) {
  return { method: 'POST', body, headers: {}, socket: { remoteAddress: '9.9.9.9' } };
}

const KEY = '3952b1dd16f28958-9663e00d1dc9955b-e9c557ef87e6ed39-310353b5a0da185d';

describe('api lib', () => {
  it('sha256(argon2) confere com gabarito da Flag 1', () => {
    expect(sha256hex(normalizeAnswer('5k{argon2}'))).toBe(
      '0ce753eaacf78542192b0639c61868a79e4221f7914c7b6c69fc0f639612d419'
    );
  });
  it('timingEqual não vaza por exceção', () => {
    expect(timingEqualHex('ab', 'ab')).toBe(true);
    expect(timingEqualHex('ab', 'ac')).toBe(false);
    expect(timingEqualHex('zz', 'ab')).toBe(false);
  });
  it('timingEqualStr compara frag em tempo constante', () => {
    expect(timingEqualStr('abc', 'abc')).toBe(true);
    expect(timingEqualStr('abc', 'abd')).toBe(false);
    expect(timingEqualStr('abc', 'abcd')).toBe(false);
  });
  it('parseUnlockKey exige 4 partes com hífen único', () => {
    expect(parseUnlockKey(KEY).ok).toBe(true);
    expect(parseUnlockKey('a-b-c').ok).toBe(false);
    expect(parseUnlockKey('a-b-c-d-e').ok).toBe(false);
    expect(parseUnlockKey('a--c-d').ok).toBe(false);
  });
  it('rate-limit barra após o limite', () => {
    _resetBuckets();
    for (let i = 0; i < 10; i++) expect(rateLimited('1.2.3.4', 10, 60_000).limited).toBe(false);
    expect(rateLimited('1.2.3.4', 10, 60_000).limited).toBe(true);
  });
});

describe('unlock estrito', () => {
  it('abre só com chave 4/4 em ordem', async () => {
    _resetBuckets();
    const res = mockRes();
    await unlock(mockReq({ key: KEY }), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });
  it('rejeita formato legado {frags} sem dica', async () => {
    _resetBuckets();
    const res = mockRes();
    await unlock(mockReq({ frags: KEY.split('-') }), res);
    expect(res.statusCode).toBe(400);
  });
  it('rejeita parcial e ordem trocada sem abrir', async () => {
    _resetBuckets();
    const partial = mockRes();
    await unlock(mockReq({ key: 'a-b-c' }), partial);
    expect(partial.statusCode).toBe(400);

    _resetBuckets();
    const swapped = mockRes();
    const parts = KEY.split('-');
    await unlock(mockReq({ key: [parts[1], parts[0], parts[2], parts[3]].join('-') }), swapped);
    const data = JSON.parse(swapped.body);
    expect(swapped.statusCode).toBe(200);
    expect(data.ok).toBe(false);
    expect(data.falta).toContain(1);
  });
});
