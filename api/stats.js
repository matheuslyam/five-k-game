import { config, json, readStats } from './_lib.js';

// PORQUE: travômetro do Vídeo 2 precisa de contadores sem expor IP/chute, então esta rota exige ADMIN_TOKEN e nunca loga segredo.
const NAMES = [
  'check:1:ok', 'check:1:fail',
  'check:2:ok', 'check:2:fail',
  'check:3:ok', 'check:3:fail',
  'check:4:ok', 'check:4:fail',
  '429'
];

export default async function handler(req, res) {
  const token = req.query?.token || new URL(req.url, 'http://x').searchParams.get('token');
  if (!config().adminToken || token !== config().adminToken) {
    return json(res, 401, { ok: false });
  }
  // PORQUE: sem KV (dev local) não há estado compartilhado — zeros com nota
  // em vez de número inventado. Em prod com KV, contadores reais por flag.
  const real = await readStats(NAMES);
  if (!real) {
    return json(res, 200, {
      ok: true,
      kv: false,
      note: 'Sem KV: contadores zerados. Ligue Vercel KV (ver docs/OPERACAO.md).',
      flags: { 1: { ok: 0, fail: 0 }, 2: { ok: 0, fail: 0 }, 3: { ok: 0, fail: 0 }, 4: { ok: 0, fail: 0 } },
      limited429: 0
    });
  }
  const flags = {};
  for (const id of [1, 2, 3, 4]) {
    flags[id] = { ok: real['check:' + id + ':ok'], fail: real['check:' + id + ':fail'] };
  }
  return json(res, 200, { ok: true, kv: true, flags, limited429: real['429'] });
}
