import { config, json } from './_lib.js';

// GET /api/stats?token=ADMIN_TOKEN -> contadores (interno, só autor).
// TODO prod: ler contadores reais do KV. MVP retorna shape + instrução.
export default async function handler(req, res) {
  const token = req.query?.token || new URL(req.url, 'http://x').searchParams.get('token');
  if (!config().adminToken || token !== config().adminToken) {
    return json(res, 401, { ok: false });
  }
  return json(res, 200, {
    ok: true,
    note: 'MVP: conecte Vercel KV para contadores reais por flag (ok/fail) + 429. Ver docs/OPERACAO.md.',
    flags: { 1: { ok: 0, fail: 0 }, 2: { ok: 0, fail: 0 }, 3: { ok: 0, fail: 0 }, 4: { ok: 0, fail: 0 } },
    limited429: 0
  });
}
