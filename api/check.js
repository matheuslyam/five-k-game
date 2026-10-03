import { config, normalizeAnswer, sha256hex, timingEqualHex, json, rateLimited, clientIp, logLine } from './_lib.js';

// PORQUE: ordem barata->cara evita gastar crypto e vazar timing antes de filtrar spam/shape.
export default async function handler(req, res) {
  const t0 = Date.now();
  const ip = clientIp(req);
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });

  const { limited } = rateLimited(ip, 10, 60_000);
  if (limited) {
    logLine('check', { ip, ms: Date.now() - t0, limited: true });
    return json(res, 429, { ok: false, error: 'rate' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 1024) return json(res, 413, { ok: false });
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { ok: false });
    }
  }
  const id = body?.id;
  const guessRaw = body?.guess;
  if (![1, 2, 3, 4].includes(id) || typeof guessRaw !== 'string' || guessRaw.length < 1 || guessRaw.length > 100) {
    return json(res, 400, { ok: false });
  }

  const guess = normalizeAnswer(guessRaw);
  const cfg = config();
  const expected = cfg.hashes[id];
  const got = sha256hex(guess);
  const ok = timingEqualHex(got, expected);

  logLine('check', {
    ip,
    id,
    ok,
    ms: Date.now() - t0,
    guessLen: guess.length,
    guessPrefix: got.slice(0, 8)
  });

  if (!ok) return json(res, 200, { ok: false });
  return json(res, 200, { ok: true, frag: cfg.frags[id] });
}
