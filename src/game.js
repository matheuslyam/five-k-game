// Funções puras do jogo (testáveis, sem DOM). Usadas pelo front e pelos testes.
export function normalizeGuess(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

// Aceita "argon2" ou "5k{argon2}" ou " 5K{Argon2} ".
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
