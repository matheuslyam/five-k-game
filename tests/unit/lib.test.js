import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { config, normalizeAnswer, sha256hex, timingEqualHex, timingEqualStr, parseUnlockKey, rateLimited, _resetBuckets } from '../../api/_lib.js';
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
  // PORQUE: respostas reais vivem só em .env/Vercel (repo público), então os
  // testes provam a fiação (hash exibido == hash do servidor) sem conter
  // nenhuma resposta literal — o gabarito é lido do próprio HTML em runtime.
  it('sha256 do normalize é estável (front+server em sync)', () => {
    expect(sha256hex(normalizeAnswer('5k{Palavra-Qualquer}'))).toBe(sha256hex('palavra-qualquer'));
  });
  it('hash exibido na Flag 1 casa com o gabarito do servidor', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const m = html.match(/id="hash1">([0-9a-f]{64})</);
    expect(m).toBeTruthy();
    expect(m[1]).toBe(config().hashes[1]);
  });
  it('hash2 da Flag 2 casa com senha+sal do esconderijo', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const h2 = html.match(/hash2=<code>([0-9a-f]{64})<\/code>/);
    const alt = html.match(/class="selo-img"[^>]*alt="([^"]+)"/);
    expect(h2).toBeTruthy();
    expect(alt).toBeTruthy();
    expect(sha256hex('cafe123' + String(alt[1]).toLowerCase())).toBe(h2[1]);
  });
  it('headerFlag casa com o gabarito da Flag 3', () => {
    expect(sha256hex(normalizeAnswer(config().headerFlag))).toBe(config().hashes[3]);
  });
  it('cookie default decodifica para pista, não para a resposta da Flag 4', () => {
    const pista = Buffer.from(config().cookieB64, 'base64').toString('utf8');
    expect(pista.length).toBeGreaterThan(0);
    expect(sha256hex(pista)).not.toBe(config().hashes[4]);
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
