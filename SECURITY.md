# Security Policy

Repo público com jogo ativo em `https://lyam.dev.br/five-k-game/`.

## Reporte

Não abra issue pública com bypass/gabarito antes do Vídeo 3 (dia dos 5k).
Reporte via DM do autor com: rota, passo a passo, print.

Sem bounty. Sem CVE para lógica de jogo (gabarito vazado por design sem auth).

## O que é esperado / aceito

- F12 aberto, view-source, DevTools: por design o bundle não contém segredos.
- Resolver mais rápido via console/automação após descobrir as keys: aceito (velocidade é inevitável).
- BurpSuite/Intruder gratuito contra `/api`: rate-limit global 10/min/IP via KV + `no-store` (sem KV ligado, vale o limite por instância — ver `docs/OPERACAO.md`). Reporte bypass de rate-limit.
- Oráculo `falta:[ids]` no unlock: aceito (64 bits/frag, só ajuda quem trocou a ordem).

## O que é vulnerabilidade real

- Segredo real (`FRAG_*`, carta, `ADMIN_TOKEN`, resposta) exposto no bundle, log, ou `GET` cacheado.
- XSS armazenado/refletido via `guess`/`nick`/`frag`/`carta` (deve usar `textContent`).
- `ADMIN_TOKEN` ou `/api/stats` acessível sem token.
- `X-Flag` vazado em rota global ou cacheada fora do desafio.

## Fora de escopo

- DDoS volumétrico, phishing, engenharia social nos comentários (moderação manual do autor).
- Compartilhamento de gabarito entre jogadores (sem auth, inevitável no MVP).
