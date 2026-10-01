# TODO — pendências (fonte única consolidada)

> Os TODOs também estão repetidos nos seus devidos documentos (`SPEC.md`, `OPERACAO.md`, `ENIGMA.md`).
> Esta lista é só o resumo para revisão rápida. Carta fica para outro momento (decisão do autor).

## Infra / Vercel

- [ ] TODO: criar projeto `five-k-game` na Vercel a partir de `https://github.com/matheuslyam/five-k-game.git` (agora desbloqueado — `vercel.json` mínimo já existe no repo).
- [ ] TODO: criar/ligar Vercel KV (ou Upstash Redis) ao projeto para rate-limit + contadores.
- [ ] TODO: configurar envs prod no projeto B: `RESP_HASH_1..4`, `FRAG_1..4` (novos, prod), `CARTA_TEXT` (placeholder por enquanto), `ADMIN_TOKEN`, `IP_SALT`.
- [ ] TODO: adicionar rewrites `/five-k-game/*` no `vercel.json` do portfólio apontando para a URL do projeto B + redirect trailing slash. Redeploy portfólio. Testar em prod.
- [ ] TODO: testar `X-Flag` e `POST /api/*` através do proxy `lyam.dev.br/five-k-game/` em aba anônima.

## Chaves / enigma

- [ ] TODO: fechar resposta Flag 2 (`senha/sal1/sal2` + esconderijo exato). Ver `docs/ENIGMA.md`.
- [ ] TODO: fechar valor Flag 3 (`X-Flag`). ATENÇÃO: valor real via `/api` + `.env`, nunca em `vercel.json` (repo público).
- [ ] TODO: fechar valor Flag 4 (`sessao` base64).
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

## Código (aguardando greenlight)

- [ ] TODO: scaffold Vite (`npm create vite@latest`, `base:'./'` em `vite.config.ts`). Não executado ainda.
- [ ] TODO: implementar front (5 telas + Espelho + `textContent` + inputs `>=16px`).
- [ ] TODO: implementar `/api/check`, `/api/unlock`, `/api/headers`, `/api/stats` na ordem barata->cara.
- [ ] TODO: QA 15min mobile (Chrome Android + Safari iOS + in-app Instagram).

## Docs

- [x] `SPEC.md`, `README.md`, `docs/OPERACAO.md`, `docs/ENIGMA.md`, `SECURITY.md`, `.env.example`, `.gitignore`, `vercel.json` — criados.
- [ ] TODO: revisar docs e fechar chaves acima antes de autorizar código.
