# AGENTS.md — five-k-game

Public CTF mini-game (Vite vanilla JS + Vercel serverless). Repo is public — never commit real secrets.

## Commands

- `cp .env.example .env` first (FAKE values only), then `npm i`, `npm run dev`
- Unit: `npm test` (vitest, include is `tests/unit/**/*.test.js` set in `vite.config.js`); single file: `npx vitest run tests/unit/game.test.js`
- E2E: `npm run test:e2e` (Playwright, `tests/e2e/`, serves `npm run preview -- --port 4173` on `localhost:4173` — rebuild with `npm run build` first if `dist/` is stale; browsers once: `npx playwright install chromium`)
- Pre-push leak check (must print `limpo` — matches secret NAMES, UI label `FRAG_` legitimately stays): `grep -rE "CARTA_TEXT|RESP_HASH_|ADMIN_TOKEN|IP_SALT|VITE_" dist/ src/ index.html && echo VAZOU || echo limpo`

## Structure

- `src/main.js` — entry, hash router (`#/` … `#/carta`), fetch, `localStorage 5k-progress`; `src/game.js` — pure helpers (normalize, `parseUnlockKey`, `parseRoute`)
- `api/_lib.js` — `config()` (env + DEV placeholders), sha256 + `timingSafeEqual`, in-memory `rateLimited`, `logLine`; `api/check.js` / `unlock.js` / `headers.js` (mobile Espelho mirror) / `stats.js` (ADMIN_TOKEN only)
- `index.html` — all 6 pages + puzzle data; `vercel.json` — security headers + `no-store` only; `docs/OPERACAO.md` — deploy/envs; `SPEC.md` — design; `docs/ENIGMA.md` — player hints (no answers)

## Rules that will break things if missed

- `vite.config.js` `base: './'` is mandatory — proxy is `lyam.dev.br/five-k-game/` → `five-k-game.vercel.app`; `base: '/'` = white screen in prod.
- Normalize must stay in sync front+server: `trim().toLowerCase()` + strip one `5k{...}` wrapper (`src/game.js` ↔ `api/_lib.js`).
- `/api/check` order is load-bearing (cheap→costly): method → rate-limit 10/min/IP → shape (`id` 1-4, `guess` 1-100 chars, body ≤1KB) → hash + `timingSafeEqual`. `/api/unlock` takes only `{key: "f1-f2-f3-f4"}` string; legacy `{frags: [...]}` is rejected with 400 by design.
- `rateLimited` in `api/_lib.js` is in-memory dev stub — prod needs Vercel KV/Upstash (multinstance bypass otherwise). Don't "optimize" around it.
- Secrets: real `RESP_HASH_*`, `FRAG_*`, `CARTA_TEXT`, `ADMIN_TOKEN`, `IP_SALT` live only in local `.env` + Vercel env. Never `VITE_*`/frontend import, never `X-Flag` real value in `vercel.json`. `DEV` fallbacks in `_lib.js` and puzzle strings in `index.html` are intentional placeholders, not leaks.
- Privacy/security: render user-controlled `guess`/`frag`/`carta` with `textContent` only (XSS = real vuln, see `SECURITY.md`); logs only `{t, route, id, ok, ipHash, ms, len, hashPrefix}` — never raw guess, frag, carta, or IP. All `/api` + pages send `Cache-Control: no-store`; `sourcemap: false`.
- Mobile is 90% of players: keep inputs `>=16px`, tap targets large, keep Espelho buttons (`/api/headers`) + clipboard `textarea` fallback in `main.js` — don't remove.
- Frags in `SPEC.md`/`docs/TODO.md` are visualization examples — rotate with `node -e "console.log([...Array(4)].map(()=>require('crypto').randomBytes(8).toString('hex')).join('\n'))"` before prod.
- Rule budget: `.agent/TOP-10-OWASP.md` must stay ≤5000 chars (loader limit) — condense, never expand.

## Fluxo de update (global rule, decisão do autor 04/10/2026)

- Todo update de código segue: editar -> `npm test` + `npm run test:e2e` (rebuild antes se `dist/` stale) + leak-check (`limpo`) -> se 1 teste falhar, loop de fix até tudo verde.
- Commit + push SOMENTE em branch separada (`feat/*`, `fix/*`). NUNCA commit/push em `main`, NUNCA merge sem pedido explícito do autor.
- Segredos (`CARTA_TEXT`, respostas, frags reais) vivem só em `.env` local (gitignored) + Vercel env. Nunca no repo, nos testes ou nos docs.
