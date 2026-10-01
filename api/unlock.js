import { config, json, rateLimited, clientIp, logLine } from './_lib.js';

// POST /api/unlock {frags:[4]} -> {ok, carta?} | {ok:false, falta:[ids]}
// Carta nunca vai no bundle; só sai aqui após validar os 4.
export default async function handler(req, res) {
  const t0 = Date.now();
  const ip = clientIp(req);
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });

  const { limited } = rateLimited(ip, 10, 60_000);
  if (limited) return json(res, 429, { ok: false, error: 'rate' });

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 2048) return json(res, 413, { ok: false });
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { ok: false });
    }
  }
  const frags = body?.frags;
  if (!Array.isArray(frags) || frags.length !== 4 || frags.some((f) => typeof f !== 'string' || f.length > 64)) {
    return json(res, 400, { ok: false });
  }

  const cfg = config();
  const norm = frags.map((f) => String(f).trim().toLowerCase());
  const falta = [1, 2, 3, 4].filter((id) => norm[id - 1] !== String(cfg.frags[id]).toLowerCase());
  const ok = falta.length === 0;
  logLine('unlock', { ip, ok, ms: Date.now() - t0 });
  if (!ok) return json(res, 200, { ok: false, falta });
  return json(res, 200, { ok: true, carta: cfg.carta });
}
