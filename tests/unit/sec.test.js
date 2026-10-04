import { describe, it, expect, afterEach } from 'vitest';
import check from '../../api/check.js';
import unlock from '../../api/unlock.js';
import { clientIp, sha256hex, _resetBuckets } from '../../api/_lib.js';

// Achados do QA-SEGURANCA que nunca podem regredir: fail-open sem env,
// rate-limit burlável via XFF e ausência de Retry-After.

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(s) { this.body = s; }
  };
}
const KEY = '3952b1dd16f28958-9663e00d1dc9955b-e9c557ef87e6ed39-310353b5a0da185d';

afterEach(() => {
  delete process.env.VERCEL;
  delete process.env.RESP_HASH_1;
  _resetBuckets();
});

describe('fail-closed sem env em prod (QA #1)', () => {
  it('check nega 500 com VERCEL=1 e sem envs', async () => {
    process.env.VERCEL = '1';
    const res = mockRes();
    await check({ method: 'POST', body: { id: 1, guess: 'palpite-errado' }, headers: {}, socket: { remoteAddress: '1.1.1.1' } }, res);
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ ok: false });
  });
  it('unlock nega 500 com VERCEL=1 e sem envs', async () => {
    process.env.VERCEL = '1';
    const res = mockRes();
    await unlock({ method: 'POST', body: { key: KEY }, headers: {}, socket: { remoteAddress: '1.1.1.1' } }, res);
    expect(res.statusCode).toBe(500);
  });
  // PORQUE: a resposta real nunca entra no repo, então o caminho ok:true é
  // provado com gabarito sintético injetado via env (mesma fiação, outro valor).
  it('dev local (sem VERCEL) mantém fallback e funciona', async () => {
    process.env.RESP_HASH_1 = sha256hex('resposta-sintetica-ok');
    const res = mockRes();
    await check({ method: 'POST', body: { id: 1, guess: 'resposta-sintetica-ok' }, headers: {}, socket: { remoteAddress: '1.1.1.1' } }, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });
});

describe('clientIp anti-spoof (QA #2)', () => {
  it('prefere x-real-ip', () => {
    expect(clientIp({ headers: { 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' }, socket: {} })).toBe('9.9.9.9');
  });
  it('usa o ÚLTIMO token do XFF (edge anexa o real no final)', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': 'spoof-1, 5.6.7.8' }, socket: {} })).toBe('5.6.7.8');
  });
  it('rotacionar prefixo forjado não zera o rate-limit', async () => {
    for (let i = 0; i < 11; i++) {
      const res = mockRes();
      await check(
        { method: 'POST', body: { id: 1, guess: 'nope' }, headers: { 'x-forwarded-for': 'spoof-' + i + ', 5.6.7.8' }, socket: { remoteAddress: '9.9.9.9' } },
        res
      );
      if (i === 10) expect(res.statusCode).toBe(429);
    }
  });
});

describe('Retry-After no 429 (QA #10)', () => {
  it('check 429 traz retry-after: 60', async () => {
    let last = null;
    for (let i = 0; i < 11; i++) {
      last = mockRes();
      await check({ method: 'POST', body: { id: 1, guess: 'nope' }, headers: {}, socket: { remoteAddress: '3.3.3.3' } }, last);
    }
    expect(last.statusCode).toBe(429);
    expect(last.headers['retry-after']).toBe('60');
  });
});
