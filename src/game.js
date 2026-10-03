export function normalizeGuess(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

export function stripFlagFormat(normalized) {
  const m = normalized.match(/^5k\{(.+)\}$/);
  return m ? m[1].trim() : normalized;
}

export function normalizeAnswer(raw) {
  return stripFlagFormat(normalizeGuess(raw));
}

export function isValidShape(raw) {
  const s = String(raw ?? '');
  return s.length >= 1 && s.length <= 100;
}

export function fragsToKey(frags) {
  return frags.map((f) => normalizeGuess(f)).join('-');
}

// PORQUE: a carta só abre com 4 frags em ordem separados por hífen único,
// então o front valida o formato antes do fetch para não criar oráculo parcial.
export function parseUnlockKey(raw) {
  const key = String(raw ?? '').trim().toLowerCase();
  if (!key || key.length > 256) return { ok: false };
  const parts = key.split('-');
  if (parts.length !== 4) return { ok: false };
  if (parts.some((p) => !p || p.length > 64 || !/^[0-9a-f]+$/.test(p))) return { ok: false };
  return { ok: true, key: parts.join('-'), parts };
}

export const ROUTES = ['#/', '#/flag-1', '#/flag-2', '#/flag-3', '#/flag-4', '#/carta'];

// PORQUE: hash desconhecido precisa cair no onboarding em vez de tela vazia,
// senão link quebrado vira softlock para jogador mobile.
export function parseRoute(hash) {
  const h = String(hash || '').trim().split('?')[0];
  return ROUTES.includes(h) ? h : '#/';
}
