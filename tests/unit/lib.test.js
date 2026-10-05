import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { config, normalizeAnswer, sha256hex, timingEqualHex, timingEqualStr, parseUnlockKey, rateLimited, countEvent, readStats, _resetBuckets, _setKvClient } from '../../api/_lib.js';
import unlock from '../../api/unlock.js';
import headers from '../../api/headers.js';
import stats from '../../api/stats.js';

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
  it('rate-limit barra após o limite', async () => {
    _resetBuckets();
    for (let i = 0; i < 10; i++) expect((await rateLimited('1.2.3.4', 10, 60_000)).limited).toBe(false);
    expect((await rateLimited('1.2.3.4', 10, 60_000)).limited).toBe(true);
  });
});

describe('unlock estrito', () => {  it('abre só com chave 4/4 em ordem', async () => {
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

// PORQUE: em prod o limite é global via KV (multinstância); sem KV (dev)
// cai para memória. Os testes provam os dois caminhos com client mockado.
function mockKv() {
  const map = new Map();
  return {
    map,
    async incr(k) {
      const v = (map.get(k) || 0) + 1;
      map.set(k, v);
      return v;
    },
    async expire() { return 1; },
    async mget(...ks) { return ks.map((k) => (map.has(k) ? map.get(k) : null)); }
  };
}

describe('rate-limit via KV', () => {
  afterEach(() => {
    _setKvClient(null);
    _resetBuckets();
  });
  it('limite global compartilhado entre instâncias (mesma chave KV)', async () => {
    const kv = mockKv();
    _setKvClient(kv);
    for (let i = 0; i < 10; i++) {
      _resetBuckets(); // simula outra instância com memória zerada
      expect((await rateLimited('5.6.7.8', 10, 60_000)).limited).toBe(false);
    }
    _resetBuckets();
    expect((await rateLimited('5.6.7.8', 10, 60_000)).limited).toBe(true);
  });
  it('KV fora do ar faz fail-open para memória (nunca 500)', async () => {
    _setKvClient({ incr: async () => { throw new Error('kv down'); }, expire: async () => 1, mget: async () => [] });
    _resetBuckets();
    const r = await rateLimited('7.7.7.7', 10, 60_000);
    expect(r.limited).toBe(false);
    expect(r.remaining).toBe(9);
  });
  it('countEvent/readStats agregam por flag sem segredo', async () => {
    const kv = mockKv();
    _setKvClient(kv);
    await countEvent('check:2:ok');
    await countEvent('check:2:fail');
    await countEvent('429');
    const s = await readStats(['check:2:ok', 'check:2:fail', '429', 'check:1:ok']);
    expect(s).toEqual({ 'check:2:ok': 1, 'check:2:fail': 1, '429': 1, 'check:1:ok': 0 });
  });
  it('sem KV, countEvent é no-op e readStats é null', async () => {
    await countEvent('check:1:ok');
    expect(await readStats(['check:1:ok'])).toBeNull();
  });
});

describe('contrato /api/headers (Espelho)', () => {
  it('GET retorna xFlag + no-store + eco de cookie', async () => {
    const res = mockRes();
    await headers({ method: 'GET', headers: { cookie: 'sessao=abc' } }, res);
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.ok).toBe(true);
    expect(typeof data.xFlag).toBe('string');
    expect(data.xFlag.length).toBeGreaterThan(0);
    expect(data.cookie).toBe('sessao=abc');
    expect(res.headers['x-flag']).toBe(data.xFlag);
  });
  it('POST é 405', async () => {
    const res = mockRes();
    await headers({ method: 'POST', headers: {} }, res);
    expect(res.statusCode).toBe(405);
  });
});

describe('contrato /api/stats (só autor)', () => {
  afterEach(() => {
    delete process.env.ADMIN_TOKEN;
    _setKvClient(null);
  });
  function req(token) {
    return { method: 'GET', url: '/?token=' + (token ?? ''), headers: {}, query: {} };
  }
  it('sem token e com token errado nega 401', async () => {
    process.env.ADMIN_TOKEN = 'segredo-local';
    for (const t of [undefined, 'errado']) {
      const res = mockRes();
      await stats(req(t), res);
      expect(res.statusCode).toBe(401);
    }
  });
  it('token certo retorna shape sem segredo', async () => {
    process.env.ADMIN_TOKEN = 'segredo-local';
    const res = mockRes();
    await stats(req('segredo-local'), res);
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.ok).toBe(true);
    expect(data.flags[1]).toEqual({ ok: 0, fail: 0 });
    expect(JSON.stringify(data)).not.toContain('segredo-local');
  });
  it('sem ADMIN_TOKEN nega sempre (fail-closed)', async () => {
    const res = mockRes();
    await stats(req('qualquer'), res);
    expect(res.statusCode).toBe(401);
  });
});
