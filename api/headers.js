import { config, json } from './_lib.js';

// GET /api/headers -> espelho mobile (canônico se X-Flag não sobreviver ao proxy).
// Retorna também o valor do desafio via JSON (lido de env), além de setar X-Flag no header.
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false });
  const cfg = config();
  res.setHeader('x-flag', String(cfg.headerFlag));
  res.setHeader('cache-control', 'no-store');
  return json(res, 200, {
    ok: true,
    xFlag: String(cfg.headerFlag),
    cookie: req.headers.cookie || '',
    hint: 'No PC: DevTools -> Network -> Headers. No celular: este espelho vale como alternativa oficial.'
  });
}
