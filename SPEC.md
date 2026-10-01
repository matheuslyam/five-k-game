# SPEC — five-k-game v0.1 (pré-build, sem código)

> Status: documentação. Nenhum código de jogo/API foi implementado ainda.
> Repo público: https://github.com/matheuslyam/five-k-game.git
> Stack decidida: Vite (confirmado pelo autor).
> Objetivo: deixar o desenho redondo antes de codar. Prioridade acima de código.

## 1. Visão

Mini-game enigma estilo CTF para comemorar 5k follows no Instagram (atual: 3.5k).
Mini-série de 3 conteúdos, cada um converte sozinho:

- **Conteúdo 1 — Lançamento (dia 01, meio-dia):** "escondi 5 flags" + o que é CTF em ~20s. Gateway pra security + recruta jogadores.
- **Conteúdo 2 — Meio (dia 02 ou 03):** leaderboard manual + 1 hint forte da flag mais travada + reação aos comentários. Vídeo-comunidade.
- **Conteúdo 3 — Solução (dia que bater 5k):** resolução comentada + carta lida + nomes. Hall da fama.

Link prod: `https://lyam.dev.br/five-k-game` (path via rewrite, não domínio próprio).

## 2. As 5 flags (resumo)

Página única + `/api` mínimo + verificação server-side. Formato global: `5k{...}` (aceita com ou sem prefixo, normalize remove).

| # | Nome | Ideia | Resposta proposta (placeholder temático) | Status |
|---|------|-------|------------------------------------------|--------|
| 0 | Tutorial | Flag exemplo `5k{bem-vindo}`, vitória <60s | fixa | definido |
| 1 | Hash | SHA-256 na tela, palavra está no audit 03 | `argon2` | confirmado |
| 2 | Salt | Mesma senha `cafe123`, `sal-grosso` vs `flor-de-sal` escondido | `flor-de-sal` | proposto, aguardando ok |
| 3 | Header | Resposta em volta da página, header `X-Flag` / espelho | `em-orbita` | proposto, aguardando ok |
| 4 | Cookie | `sessao=YmlzY29pdG8tNWs=` base64, eco audit 02 | `biscoito-5k` | proposto, aguardando ok |
| 5 | Final | 4 frags formam chave que abre a carta | `frag1-frag2-frag3-frag4` | carta pendente |

> NOTA LEAK: respostas acima são intencionais em doc público porque também são descobríveis via vídeos/página (mesmo nível de spoiler do V1). Hashes reais e frags prod NUNCA vão ao repo — só Vercel env + `.env` local. Frags abaixo são exemplo visual, descartar antes do prod.

Detalhe de descoberta do zero: ver `docs/ENIGMA.md`.

## 3. Decisões tomadas + porquê

1. **Vercel, 2 projetos + rewrite proxy no portfólio.** Porque o setup atual já é esse (`vercel.json` com rewrites, ex: `/the-knight-game`). Mantém portfólio dono de `lyam.dev.br`, jogo deployado separado, sem monorepo e sem copiar pasta.
2. **Backend mínimo permitido (`/api` + `.env`).** "Sem backend" era grosso modo para "simples", não constraint absoluto. Constraint maior (matar F12+30s) sobrescreve. UX continua client-side, autoridade no server.
3. **AES + frags de alta entropia, nunca base64 puro para segredo.** Base64 é encoding, não criptografia. Qualquer F12 + `atob()` abre em 30s. AES-GCM com chave derivada dos frags força descobrir key por key.
4. **Normalize `trim().toLowerCase()` + aviso de padrão visível.** Evita softlock por digitação no mobile (`ARGON2` vs `argon2`), mas deixa explícito o formato esperado.
5. **Leaderboard manual raiz, fora do jogo.** Live-board desmotiva atrasado, incentiva cola rápida e não dá pra atualizar real-time na mão. No jogo só progresso pessoal `x/5` + CTA "me marca". Placar só no Vídeo 2, hall no Vídeo 3. Dúvida original sobre mostrar leaderboard jogando: decisão = **não mostrar**.
6. **Ordem livre 1-4, final bloqueada até 4/4.** Evita softlock linear (travar na 3 e abandonar).
7. **Observabilidade mínima Vercel nativa.** Runtime Logs + KV contadores. Sem Log Drain pago. Suficiente para travômetro do Vídeo 2 sem custo/LGPD.
8. **Docs públicas nível README jogador + OPERACAO.** Full open-source vazaria gabarito no próprio repo público.

## 4. Constraints duras

- Repo público no GitHub. Zero segredo commitado.
- Path `/five-k-game/` com trailing slash obrigatório. `vercel.json` rewrites só funcionam em prod, `bun run dev` ignora.
- Público 90% mobile + in-app browser do Instagram (sem DevTools/Network). Todo desafio desktop-only precisa de fallback "Espelho".
- Front mobile-first: input `>=16px` (sem zoom iOS), botão `>=48px`, `100dvh` + sticky, teclado só abre em toque real.
- Fronteira de moderação: sem Discord/comunidade para raid. Moderação de comentários manual pelo autor (deleta backseat/gabarito).
- Threat model: espertinho com BurpSuite gratuito é esperado. DDoS em escala / atacante com dinheiro não é esperado. Foco em matar exploit gratuito de 30s, não em segurança bancária.
- Carta ainda não escrita. Usar placeholder até v0.2.

## 5. Fora de escopo / adiado (com motivo)

- Texto final da carta — pedido do autor: depois.
- Leaderboard automático (Supabase/Firebase) — só se viralizar após V2.
- Anti-gabarito total (conta por usuário) — impossível sem auth, fora do MVP.
- CAPTCHA / WAF pago / proteção DDoS além do básico Vercel.
- Log Drain (Axiom/BetterStack) — só se Runtime Logs não bastarem.
- PBKDF2 pesado no server — peso fica no client para atrasar brute offline; server usa `SHA-256 + timingSafeEqual` (microssegundos).

## 6. Stack

- Front: Vite static + vanilla JS + WebCrypto. `vite.config.ts` com `base: './'` (obrigatório para proxy, senão tela branca).
  - TODO: scaffold Vite ainda não executado (sem `package.json`, sem `src/`). Ver `docs/TODO.md`.
- API: Vercel Serverless `POST /api/check`, `POST /api/unlock`, `GET /api/headers` (espelho mobile), `GET /api/stats?token=` (interno).
  - TODO: nenhuma function implementada ainda.
- Store: Vercel KV / Upstash Redis (rate-limit + contadores). Não usar rate-limit in-memory (bypass em serverless multinstância).
  - TODO: criar store KV na Vercel e ligar ao projeto.
- Hosp: Projeto A `portfolio` (dono do domínio) + Projeto B `five-k-game` (a criar na Vercel a partir deste repo; `vercel.json` mínimo já existe neste repo para desbloquear a criação).
  - TODO: criar projeto B na Vercel + adicionar rewrites no portfólio + testar proxy em prod.
- Docs: `README.md`, `docs/OPERACAO.md`, `docs/ENIGMA.md`, `SECURITY.md`.

## 7. Arquitetura (resumo, sem código)

```
browser --lyam.dev.br/five-k-game/*--> [portfolio rewrite proxy] --> [five-k-game.vercel.app]
                                              |                              |-- / (static)
                                              |                              |-- /api/check (rate-limit -> valida -> retorna frag)
                                              |                              |-- /api/unlock (valida 4 frags -> retorna carta)
                                              |                              |-- /api/headers (espelho mobile)
```

- `.env` server-only (nunca `NEXT_PUBLIC_`/`VITE_`): `RESP_HASH_1..4`, `FRAG_1..4` (12-16 hex aleatórios), `CARTA_TEXT`, `ADMIN_TOKEN`, `IP_SALT`.
- Front tem zero segredo: só UI + hashes para feedback instantâneo opcional.
- Ordem handler `/api/check` (barato -> caro): method -> KV rate 10/min/IP -> shape (1..100 chars) -> normalize server -> `timingSafeEqual` -> retorna frag ou erro genérico. `Cache-Control: no-store`, same-origin.
- F12 vê UI + fetch, não vê resposta/frag/carta. Pular validação no console abre UI vazia. Brute offline impossível (nada no client), online morre no 429.

## 8. Chaves — definidas (placeholders temáticos, estilo trocadilho sec)

Escolha do autor: placeholders temáticos + trocadilho sec (não curtas diretas).

- Flag 1: `argon2` (audit 03). `sha256=0ce753eaacf78542192b0639c61868a79e4221f7914c7b6c69fc0f639612d419`.
- Flag 2: `senha=cafe123`, `sal1=sal-grosso` (`sha256(cafe123sal-grosso)=da3109...def99`), `sal2=flor-de-sal` escondido em comentário HTML/alt. Input esperado: `flor-de-sal` (`sha256=48eeed...5a19a0c8b`). Porquê inteligente: dois sais culinários reais, mesma senha, hashes totalmente diferentes — demo memorável de salt. Mobile: 11 chars, hífens ok, sem acento.
- Flag 3: `em-orbita` (`sha256=4f93d9...6317e9f2`). Porquê: ecoa hint "em volta", tema órbita, curto (9 chars), sem acento. Servido via header `X-Flag` em `/api` (nunca `vercel.json` estático) + espelho mobile.
- Flag 4: cookie `sessao=YmlzY29pdG8tNWs=` → decode → `biscoito-5k` (`sha256=bc9ffe...4dfecc`). Porquê: cookie=biscoito (trocadilho clássico), inclui marca `5k`, eco audit 02 sobre storage. 11 chars, hífen ok.
- [ ] TODO autor: dar ok ou trocar qualquer uma acima antes do seed prod.
- [ ] TODO: Escrever `CARTA_TEXT` (adiado pelo autor, fica para outro momento).
- [ ] TODO: Criar projeto B na Vercel + configurar envs prod + KV (ver `docs/TODO.md`).
- [ ] TODO: Scaffold Vite (`npm create vite@latest`, `base:'./'`, `src/`).

### Frags de visualização (EXEMPLO, NÃO USAR EM PROD)

Gerados em 30/09/2026 só para visualizar formato/entropia enquanto revisa os docs:

```
FRAG_1=3952b1dd16f28958
FRAG_2=9663e00d1dc9955b
FRAG_3=e9c557ef87e6ed39
FRAG_4=310353b5a0da185d
```

- TODO: gerar novos frags na hora do deploy prod (`node -e "...randomBytes(8)..."`) e guardar só em `.env` local + Vercel env. Estes acima devem ser descartados/rotacionados antes do lançamento.
- Regra frag prod: 12-16 hex aleatórios, não palavra de dicionário. Resposta de input: curta, sem espaço, sem acento.

## 9. Segurança — checklist pré-deploy

Ver lista completa em `docs/OPERACAO.md` seção segurança. Resumo:

- Nenhum segredo no bundle (`grep` antes do push deve dar zero).
- Source maps off, `.git` não deployado, sem `console.log` de segredo, sem logar `guess` cru.
- Render com `textContent`, nunca `innerHTML` com `guess`/`nick`/`frag`/`carta`.
- CSP `default-src 'self'; script-src 'self'` via `vercel.json` do jogo.
- Cookie `sessao=` exceção documentada: legível via JS (senão quebra puzzle), `SameSite=Lax`, sem dado real.
- Erro 500 genérico, sem stack trace. Validação de shape antes de crypto.
- Headers: `nosniff`, `DENY`, `no-referrer`, HSTS padrão.

## 10. Domínio proxy — spec

No `vercel.json` do portfólio, replicar padrão knight:

```json
{ "source": "/five-k-game", "destination": "https://five-k-game.vercel.app/" },
{ "source": "/five-k-game/", "destination": "https://five-k-game.vercel.app/" },
{ "source": "/five-k-game/:path*", "destination": "https://five-k-game.vercel.app/:path*" }
```

+ redirect `/five-k-game` -> `/five-k-game/` permanente. Linkar sempre com `/` final.
Riscos: `X-Flag` precisa sobreviver ao proxy — testar em prod. Se não vier, usar `/api/headers` como canônico mobile. `POST /api/*` passa pelo `:path*` por padrão.

## 11. Logs / observabilidade — spec mínima

- Log 1 linha JSON por request: `{t, route, id, ok, ipHash, ua20, ms, limited}`.
- Nunca: `guess` cru, `frag`, carta, IP cru. Logar só `len` + `hashPrefix: sha256(guess).slice(0,8)`.
- `ipHash = sha256(ip+IP_SALT_DAILY).slice(0,12)` (LGPD).
- KV: `incr 5k:check:{id}:ok/fail`, `incr 5k:429`. `GET /api/stats?token=ADMIN_TOKEN` só autor, para travômetro do Vídeo 2.
- Footer do jogo: "logs anônimos de jogabilidade".

## 12. Docs

- `README.md` — jogador.
- `docs/OPERACAO.md` — deploy, envs (nomes, sem valores), logs/stats, rotação se vazar.
- `docs/ENIGMA.md` — H1/H2 apenas, sem respostas.
- `SECURITY.md` — reporte via DM, sem publicar bypass antes do Vídeo 3.

## 13. QA crasso mobile (15min pós-subir)

1. Chrome Android + Safari iOS + aberto de dentro do Instagram (os 3).
2. Modo avião on/off no meio de flag (localStorage).
3. Digita `ARGON2`, ` Argon2 `, `argon2` — os 3 passam.
4. Limpa cookies/storage — dá pra re-colar frag e continuar.
5. Teclado aberto não esconde botão Validar.
6. Header via domínio final em aba anônima (proxy + `no-store`).

## 14. Próximo passo

- [x] Keys 2/3/4 definidas como placeholder temático (`flor-de-sal`, `em-orbita`, `biscoito-5k`) — aguardando ok final do autor.
- [x] Frags visualização gerados (descartar antes do prod).
- [x] Código implementado (Vite + `/api` + testes, build ok, 8 unit passando). QA fica para prod.
- [ ] TODO: criar projeto B na Vercel a partir de https://github.com/matheuslyam/five-k-game.git + KV + envs prod.
- [ ] TODO: escrever carta v0.2 (adiado).
- [ ] TODO: QA mobile em prod via domínio/path.
