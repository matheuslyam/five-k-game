import { config, json, rateLimited, countEvent, clientIp, logLine, parseUnlockKey, timingEqualStr, isProd, missingProdEnv } from './_lib.js';

export default async function handler(req, res) {
  const t0 = Date.now();
  const ip = clientIp(req);
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });

  if (isProd() && missingProdEnv().length) {
    logLine('unlock', { ip, ms: Date.now() - t0 });
    return json(res, 500, { ok: false });
  }

  const { limited } = await rateLimited(ip, 10, 60_000);
  if (limited) {
    res.setHeader('retry-after', '60');
    await countEvent('429');
    return json(res, 429, { ok: false, error: 'rate' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 2048) return json(res, 413, { ok: false });
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { ok: false });
    }
  }

  // PORQUE: a carta só abre com a chave única frag1-frag2-frag3-frag4 em ordem,
  // então qualquer outro formato (inclusive o array legado) é rejeitado sem dica.
  if (body?.frags !== undefined || typeof body?.key !== 'string') {
    return json(res, 400, { ok: false });
  }
  const parsed = parseUnlockKey(body.key);
  if (!parsed.ok) return json(res, 400, { ok: false });

  const cfg = config();
  const expected = [1, 2, 3, 4].map((id) => String(cfg.frags[id]).toLowerCase());
  const falta = [1, 2, 3, 4].filter((id) => !timingEqualStr(parsed.parts[id - 1], expected[id - 1]));
  const ok = falta.length === 0;
  logLine('unlock', { ip, ok, ms: Date.now() - t0 });
  if (!ok) return json(res, 200, { ok: false, falta });
  return json(res, 200, { ok: true, carta: cfg.carta });
}
