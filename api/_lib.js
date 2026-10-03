import crypto from 'node:crypto';

// PORQUE: prod lê segredos só de env (repo é público), então aqui ficam
// apenas placeholders temáticos para dev local nunca confundir com prod.
const DEV = {
  RESP_HASH_1: '0ce753eaacf78542192b0639c61868a79e4221f7914c7b6c69fc0f639612d419',
  RESP_HASH_2: '48eeed6908d4151249c6a0c036153eb9a06889d580c35ec85dbb0965a19a0c8b',
  RESP_HASH_3: '4f93d9aa196ce475724650d54232fe55778a8b6cc8e5738479e96b8e6317e9f2',
  RESP_HASH_4: 'bc9ffe6e9fc59d1aea56c50eb9309fbca801206b9cd64aa08bbead0ba4d4fecc',
  FRAG_1: '3952b1dd16f28958',
  FRAG_2: '9663e00d1dc9955b',
  FRAG_3: 'e9c557ef87e6ed39',
  FRAG_4: '310353b5a0da185d',
  CARTA_TEXT: 'Carta placeholder (dev). Texto real só em prod via CARTA_TEXT.',
  HEADER_FLAG: 'em-orbita',
  COOKIE_B64: 'YmlzY29pdG8tNWs='
};

export function env(name, fallback) {
  return process.env[name] || fallback;
}

export function config() {
  return {
    hashes: {
      1: env('RESP_HASH_1', DEV.RESP_HASH_1),
      2: env('RESP_HASH_2', DEV.RESP_HASH_2),
      3: env('RESP_HASH_3', DEV.RESP_HASH_3),
      4: env('RESP_HASH_4', DEV.RESP_HASH_4)
    },
    frags: {
      1: env('FRAG_1', DEV.FRAG_1),
      2: env('FRAG_2', DEV.FRAG_2),
      3: env('FRAG_3', DEV.FRAG_3),
      4: env('FRAG_4', DEV.FRAG_4)
    },
    carta: env('CARTA_TEXT', DEV.CARTA_TEXT),
    headerFlag: env('HEADER_FLAG', DEV.HEADER_FLAG),
    cookieB64: env('COOKIE_B64', DEV.COOKIE_B64),
    adminToken: env('ADMIN_TOKEN', '')
  };
}

export function normalizeAnswer(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  const m = s.match(/^5k\{(.+)\}$/);
  return m ? m[1].trim() : s;
}

// PORQUE: front e server duplicam o parser de propósito para o server
// continuar autoridade mesmo com bundle do front adulterado no console.
export function parseUnlockKey(raw) {
  const key = String(raw ?? '').trim().toLowerCase();
  if (!key || key.length > 256) return { ok: false };
  const parts = key.split('-');
  if (parts.length !== 4) return { ok: false };
  if (parts.some((p) => !p || p.length > 64 || !/^[0-9a-f]+$/.test(p))) return { ok: false };
  return { ok: true, key: parts.join('-'), parts };
}

export function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

export function timingEqualHex(a, b) {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

// PORQUE: frags são comparados em tempo constante para não vazar
// posição do erro via timing para quem automatiza chute.
export function timingEqualStr(a, b) {
  try {
    const ba = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

// PORQUE: em serverless cada instância tem sua memória, então este
// limite é apenas anti-spam barato de dev — prod precisa de KV compartilhado.
const buckets = new Map();
export function rateLimited(ip, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + windowMs };
  if (now > b.reset) {
    b.count = 0;
    b.reset = now + windowMs;
  }
  b.count += 1;
  buckets.set(ip, b);
  return { limited: b.count > limit, remaining: Math.max(0, limit - b.count) };
}
export function _resetBuckets() {
  buckets.clear();
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export function hashIp(ip) {
  const salt = env('IP_SALT', 'dev-salt');
  return sha256hex(ip + salt).slice(0, 12);
}

export function logLine(route, { id, ok, ip, ms, limited, guessLen, guessPrefix }) {
  const line = {
    t: new Date().toISOString(),
    route,
    id: id ?? null,
    ok: !!ok,
    ipHash: hashIp(ip),
    ms,
    limited: !!limited,
    len: guessLen ?? null,
    hp: guessPrefix ?? null
  };
  console.log(JSON.stringify(line));
}
