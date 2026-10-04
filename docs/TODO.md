# TODO — pendências (fonte única consolidada)

> Os TODOs também estão repetidos nos seus devidos documentos (`SPEC.md`, `OPERACAO.md`, `ENIGMA.md`).
> Esta lista é só o resumo para revisão rápida. Carta fica para outro momento (decisão do autor).

## Infra / Vercel

- [ ] TODO: criar projeto `five-k-game` na Vercel a partir de `https://github.com/matheuslyam/five-k-game.git` (agora desbloqueado — `vercel.json` mínimo já existe no repo).
- [ ] TODO: criar/ligar Vercel KV (ou Upstash Redis) ao projeto para rate-limit + contadores.
- [ ] TODO: configurar envs prod no projeto B: `RESP_HASH_1..4`, `FRAG_1..4` (novos, prod), `CARTA_TEXT` (placeholder por enquanto), `ADMIN_TOKEN`, `IP_SALT`.
- [ ] TODO: adicionar rewrites `/five-k-game/*` no `vercel.json` do portfólio apontando para a URL do projeto B + redirect trailing slash. Redeploy portfólio. Testar em prod.
- [ ] TODO: testar `X-Flag` e `POST /api/*` através do proxy `lyam.dev.br/five-k-game/` em aba anônima.

## Chaves / enigma (ELOS definido 04/10/2026 — respostas só em `.env`)

- [x] Flag 1: palavra do audit 08.
- [x] Flag 2: `senha=cafe123`, `sal1=sal-grosso`, `sal2` no alt da imagem + Espelho.
- [x] Flag 3: valor do audit 09, via `/api` (nunca `vercel.json`).
- [x] Flag 4: cookie base64 vira pista + nome do golpe em inglês (audit 07).
- [x] Carta V3 oficial (só `.env` local + Vercel env) + vídeo pós-carta com easter egg.
- [ ] TODO: seed prod (hashes + `FRAG_*` novos + `CARTA_TEXT` + demais envs no projeto B).

## Frags visualização (descartar antes do prod)

Gerados em 30/09/2026 apenas para visualizar formato enquanto revisa docs. NÃO usar em prod:

```
FRAG_1=3952b1dd16f28958
FRAG_2=9663e00d1dc9955b
FRAG_3=e9c557ef87e6ed39
FRAG_4=310353b5a0da185d
```

- [ ] TODO: gerar novos frags no deploy prod e guardar só em `.env` local + Vercel env.

## Código (greenlight do autor — implementado, QA em prod)

- [x] Scaffold Vite (`base:'./'`, `src/`, `api/`) — feito.
- [x] Front (5 telas + Espelho + `textContent` + inputs `>=16px`) — feito.
- [x] `/api/check`, `/api/unlock`, `/api/headers`, `/api/stats` na ordem barata->cara — feito (KV real pendente, memória no MVP).
- [x] Testes: Vitest unit (`normalize`, `sha256`, `rate-limit`) + Playwright e2e (tutorial + padrão mobile) — 8 unit passando, build ok.
- [ ] TODO: plugar Vercel KV real (trocar memória em `api/_lib.js`).
- [ ] TODO: QA 15min mobile em prod (Chrome Android + Safari iOS + in-app Instagram) via `lyam.dev.br/five-k-game/` — só após criar projeto Vercel + rewrites portfólio.

## Docs

- [x] `SPEC.md`, `README.md`, `docs/OPERACAO.md`, `docs/ENIGMA.md`, `SECURITY.md`, `.env.example`, `.gitignore`, `vercel.json` — criados.
- [ ] TODO: revisar docs e fechar chaves acima antes de autorizar código.
