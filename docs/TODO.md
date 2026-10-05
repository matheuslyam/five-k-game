# TODO — pendências (fonte única consolidada)

> Os TODOs também estão repetidos nos seus devidos documentos (`SPEC.md`, `OPERACAO.md`, `ENIGMA.md`).
> Esta lista é só o resumo para revisão rápida. Carta fica para outro momento (decisão do autor).

## Infra / Vercel

- [x] Projeto `five-k-game` na Vercel criado a partir deste repo.
- [x] Envs prod configuradas (`RESP_HASH_1..4`, `FRAG_1..4` rotacionados, `CARTA_TEXT` one-liner, `ADMIN_TOKEN`, `IP_SALT`).
- [x] Rewrites `/five-k-game/*` no portfólio + redirect trailing slash + redeploy.
- [x] `X-Flag` e `POST /api/*` testados através do proxy em aba anônima (Espelho é o canônico; header pode não sobreviver ao proxy).
- [ ] TODO: criar/ligar Vercel KV ao projeto (código pronto em `api/_lib.js`, usa as envs `KV_REST_API_URL`/`KV_REST_API_TOKEN` quando presentes).

## Chaves / enigma (ELOS definido 04/10/2026 — respostas só em `.env`)

- [x] Flag 1: palavra do audit 08.
- [x] Flag 2: `senha=cafe123`, `sal1=sal-grosso`, `sal2` no alt da imagem + Espelho.
- [x] Flag 3: valor do audit 09, via `/api` (nunca `vercel.json`).
- [x] Flag 4: cookie base64 vira pista + nome do golpe em inglês (audit 07).
- [x] Carta V3 oficial (só `.env` local + Vercel env one-liner) + vídeo pós-carta + cerimônia `#/carta/aberta` (boot, typing, música, tick).
- [x] Seed prod (hashes + `CARTA_TEXT` + demais envs no projeto B).
- [ ] TODO (autor, antes do link na bio): confirmar `FRAG_*` de prod rotacionados — acertar 1 flag em prod deve devolver frag DIFERENTE dos placeholders públicos de `SPEC.md`/`QA-SEGURANCA` (se igual, gerar novos, colar na Vercel e redeploy).

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
- [x] Front (telas + Espelho + `textContent` + inputs `>=16px`) + cerimônia terminal (reskin knight, sem gates de movimento por decisão do autor).
- [x] `/api/check`, `/api/unlock`, `/api/headers`, `/api/stats` na ordem barata->cara + KV real quando ligado (memória só dev/fallback).
- [x] Testes: Vitest unit + Playwright e2e (mobile+desktop) verdes; `npm audit` limpo (vite 7 + vitest 4).
- [ ] TODO: QA 15min mobile em prod (Chrome Android + Safari iOS + in-app Instagram) via `lyam.dev.br/five-k-game/` antes do link na bio.

## Docs

- [x] `SPEC.md`, `README.md`, `docs/OPERACAO.md`, `docs/ENIGMA.md`, `SECURITY.md`, `.env.example`, `.gitignore`, `vercel.json` — criados.
- [ ] TODO: revisar docs e fechar chaves acima antes de autorizar código.
