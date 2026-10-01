# TODO — pendências (fonte única consolidada)

> Os TODOs também estão repetidos nos seus devidos documentos (`SPEC.md`, `OPERACAO.md`, `ENIGMA.md`).
> Esta lista é só o resumo para revisão rápida. Carta fica para outro momento (decisão do autor).

## Infra / Vercel

- [ ] TODO: criar projeto `five-k-game` na Vercel a partir de `https://github.com/matheuslyam/five-k-game.git` (agora desbloqueado — `vercel.json` mínimo já existe no repo).
- [ ] TODO: criar/ligar Vercel KV (ou Upstash Redis) ao projeto para rate-limit + contadores.
- [ ] TODO: configurar envs prod no projeto B: `RESP_HASH_1..4`, `FRAG_1..4` (novos, prod), `CARTA_TEXT` (placeholder por enquanto), `ADMIN_TOKEN`, `IP_SALT`.
- [ ] TODO: adicionar rewrites `/five-k-game/*` no `vercel.json` do portfólio apontando para a URL do projeto B + redirect trailing slash. Redeploy portfólio. Testar em prod.
- [ ] TODO: testar `X-Flag` e `POST /api/*` através do proxy `lyam.dev.br/five-k-game/` em aba anônima.

## Chaves / enigma (definidas como placeholder temático, aguardando ok final)

- [x] Flag 1: `argon2` (audit 03) — confirmado.
- [x] Flag 2 proposta: `senha=cafe123`, `sal1=sal-grosso`, `sal2=flor-de-sal` (escondido em comentário/alt). Input: `flor-de-sal`. Porquê: sais culinários reais, mesma senha, hashes diferentes.
- [x] Flag 3 proposta: `em-orbita` (ecoa "em volta", 9 chars). Servir via `/api`, nunca `vercel.json`.
- [x] Flag 4 proposta: cookie `sessao=YmlzY29pdG8tNWs=` → `biscoito-5k` (cookie=biscoito + marca 5k).
- [ ] TODO autor: dar ok ou trocar qualquer uma acima antes do seed prod.
- [ ] TODO: carta — adiado (autor revisa depois).

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
