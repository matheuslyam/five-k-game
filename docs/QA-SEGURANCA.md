# QA-SEGURANCA — auditoria total (segurança + funcionamento)

> Data: 03/10/2026. Escopo autorizado: código local + produção (`five-k-game.vercel.app`, `lyam.dev.br/five-k-game/`).
> Veredito: **REPROVADO para lançamento** — 1 achado crítico ativo em produção (item 1). Todo o resto é corrigível antes do Vídeo 1.
> Metodologia: revisão estática + harness Node executando os handlers reais (`api/*.js`, 42 asserts) + sondas `curl` em produção + suítes do repo. Nada foi "achado no olho": cada item crítico tem prova de exploit reproduzível (ver §8).

## 1. Achados (ordenados por severidade)

| # | Achado | Sev | Ator capaz | Ferramenta da prova | Status |
|---|--------|-----|------------|---------------------|--------|
| 1 | Produção rodando com defaults DEV (fail-open): frags/hashes/carta/flags = valores públicos do repo | CRÍTICA | script kid (view-source) | `curl` POST `/api/check` | ATIVO EM PROD, exige fix + rotação |
| 2 | Rate-limit burlável via `X-Forwarded-For` forjado | ALTA | senior | harness (30 reqs, 0×429) | provado local, fix no repo |
| 3 | Deps de dev vulneráveis: vitest critical 9.8, vite high 7.5, +3 moderate | ALTA* | — | `npm audit` | *só máquina dev, nada vai ao bundle |
| 4 | Leak-check documentado nunca passa (falso-positivo por design) | ALTA (processo) | — | `findstr`/`grep` no `dist/` | fix documental |
| 5 | Flag 3 quebrada no PC: página `/` não serve `X-Flag` (só `/api/headers`) | MÉDIA (funcional) | — | `curl -sI /` em prod | exige decisão de design |
| 6 | Edge cache com `Age: 21` apesar de `Cache-Control: no-store` | MÉDIA | — | `curl -sI /` em prod | fix em `vercel.json` |
| 7 | `lyam.dev.br/five-k-game/` → 404 (rewrites do portfólio pendentes) | MÉDIA (lançamento) | — | fetch | fora deste repo, bloqueia divulgação |
| 8 | E2E exige `npx playwright install` não documentado + dep `playwright` redundante | BAIXA | — | `npx playwright test` falhou 6/6 antes do install | fix documental/limpeza |
| 9 | Oráculo `falta:[ids]` no `/api/unlock` | BAIXA (aceito) | — | harness | por design, sem vantagem prática (64 bits/frag) |
| 10 | `429` sem `Retry-After` | BAIXA (UX) | — | harness | fix trivial |

### 1. Produção em fail-open (CRÍTICA — ativa)
**Prova (produção, 2 requests):**
```
POST /api/check {"id":1,"guess":"argon2"} → 200 {"ok":true,"frag":"3952b1dd16f28958"}
GET  /api/headers → 200 {"xFlag":"em-orbita", ...}
```
`3952b1dd16f28958` e `em-orbita` são exatamente os placeholders públicos de `api/_lib.js` e `SPEC.md`. Ou seja: o projeto B foi deployado **sem envs**, e `config()` caiu silenciosamente para os DEV. Consequência: qualquer pessoa com o repo público resolve as 4 flags offline (respostas + hashes estão no HTML) e coleta os frags — o jogo inteiro é desbloqueável sem jogar. `ADMIN_TOKEN` vazio também nega `/api/stats` sempre (fail-closed, único ponto são).
**Causa raiz:** fallback silencioso para defaults públicos. **Fix:** fail-closed quando `process.env.VERCEL` presente e env ausente (`check`/`unlock` → 500 genérico + log) + configurar envs prod + **rotacionar todos os frags** (os atuais estão impressos no repo, neste relatório e nos logs de acesso).

### 2. Bypass de rate-limit via XFF (ALTA — provada)
**Prova (harness local, handlers reais):** 30 POSTs `/api/check` do mesmo socket rotacionando `X-Forwarded-For: spoof-N` → **30×200, 0×429**. `clientIp()` confia no **primeiro** token do XFF, que é controlado pelo cliente (na Vercel o edge anexa o IP real ao **final** da lista). Com Burp Intruder + lista de XFF, o limite de 10/min vira decorativo — brute online ilimitado.
**Fix:** preferir `x-real-ip` (setado pela edge Vercel) com fallback para o **último** token do XFF; manter KV compartilhado (TODO existente — stub em memória também zera a cada cold start/instância).

### 3. Dependências de dev vulneráveis (ALTA de escopo dev)
`npm audit`: 5 vulns — vitest critical 9.8 (GHSA-5xrq-8626-4rwp, RCE quando UI server exposto), vite high 7.5 (GHSA-fx2h-pf6j-xcff, `server.fs.deny` bypass no Windows), +3 moderate (vitest-mocker, esbuild, vite NTLM/map). **Escopo:** `api/` tem zero dependências e `dist/` é estático — nada disso chega ao jogador; risco é na máquina dev/CI. **Fix:** `npm i -D vitest@^4 vite@^7` + retestar tudo; nunca expor `vite --host` / `vitest --ui`.

### 4. Leak-check documentado é falso-positivo permanente (ALTA de processo)
O comando de `docs/OPERACAO.md` (`grep -r "argon2\|FRAG_\|CARTA" dist/ src/`) **sempre** casa: o bundle contém o label de UI `"FRAG_"+id` (1 ocorrência, legítima) — logo nunca imprime `limpo` e treina o time a ignorar o gate. **Fix:** casar valores, não nomes (hashes hex + `CARTA_TEXT` + `VITE_`), excluindo o label.

### 5. Flag 3 não existe no documento (MÉDIA funcional)
`curl -sI /` em produção: **nenhum `X-Flag`** na página. Só `GET /api/headers` seta/retorna o header. O enunciado ("DevTools → Network → Headers → procure `X-Flag`") falha no PC — só o Espelho funciona. E o valor **não pode** ir para `vercel.json` (repo público = leak, como o próprio SPEC proíbe). **Fix proposto:** tornar o Espelho canônico na Dica H2 (texto do `index.html`) em vez de prometer header no documento.

### 6. Edge cache servindo página com `Age: 21` sob `no-store` (MÉDIA)
Resposta `/` em prod: `Cache-Control: no-store` **e** `X-Vercel-Cache: HIT, Age: 21`. A edge está cacheando a página do puzzle — risco de servir conteúdo stale (e de cachear futuro header dinâmico). **Fix:** `Vercel-CDN-Cache-Control: no-store` + `CDN-Cache-Control: no-store` no `vercel.json`.

### 7. Domínio oficial de divulgação retorna 404 (MÉDIA, fora deste repo)
`lyam.dev.br/five-k-game/` → **404**: rewrites do portfólio ainda não configurados. O link que vai nos vídeos não funciona. Requer ação no repositório do portfólio (receita em `docs/OPERACAO.md` §1.1).

### 8–10. Menores
- **E2E quebrou 6/6** em máquina fresca (browsers ausentes); após `npx playwright install chromium`: **6/6 verde**. Falta documentar o prereq; `playwright: ^1.0.0` é redundante com `@playwright/test` ( CLI vem nos dois).
- **`falta:[1,2]`** (unlock com ordem trocada) é oráculo real, mas cada frag tem 64 bits — o oráculo não acelera brute-force de forma prática e ajuda o jogador legítimo que trocou a ordem. **Aceito por design.**
- **`429` sem `Retry-After`**: front usa mensagem fixa de 1 min; header padronizaria o comportamento.

## 2. Testado e aprovado (com prova)

- **Contrato `/api/check` (13 asserts):** 200 genérico sem dica no erro, 405 em GET, 400 em `id` inválido/string/ausente, guess vazio/>100, body >1024→413, JSON inválido→400, normalize (`ARGON2`, `5K{...}`, unicode `İ` sem 500).
- **Contrato `/api/unlock` (7 asserts):** só `{key}` abre; legado `{frags}`→400; parcial→400; uppercase/espaços normaliza; GET→405; rate 11 reqs→429.
- **`/api/stats`:** sem token→401, token errado→401, token certo→200 sem segredo; com `ADMIN_TOKEN` vazio nega sempre (fail-closed provado).
- **`/api/headers`:** 200 + `x-flag` + `no-store` + eco de cookie (por design/Espelho); POST→405.
- **Fronteira de confiança:** front 100% bypassado no harness (chamadas diretas) — servidor continua autoridade; frag fabricado nunca abre (`falta=[1,2,3,4]`); tutorial client-only não entrega nada; carta só renderiza com `ok:true` do servidor.
- **XSS/DOM:** zero `innerHTML`/`outerHTML`/`document.write`/`eval` em `src/`, `index.html` e `api/` (tudo `textContent`); regexes limitadas por shape (100/256/64 chars, sem ReDoS).
- **Offline:** hashes públicos do HTML conferem (`cafe123+sal`, cookie→`biscoito-5k`, DEV hashes ↔ respostas-doc ponta a ponta) — quebrar offline equivale a resolver o puzzle, não a bypassar; frag segue gated no servidor.
- **Timing:** `timingSafeEqual` com delta sub-µs (11.3ms vs 6.9ms em 20k iterações) — não explorável via rede.
- **Logs/LGPD:** nenhuma ocorrência de guess cru, frag, token ou IP cru em todas as linhas capturadas; só `len` + `hp` (prefixo SHA) + `ipHash`.
- **Bundle:** sem segredos reais, sem `.map`, assets relativos (`./assets/`, proxy-safe); `.env` ausente e gitignored; histórico git sem valores reais (só placeholders documentados).
- **Headers prod:** CSP, `nosniff`, `DENY`, `no-referrer`, `no-store` ativos; HSTS presente via plataforma Vercel (não declarado no `vercel.json` — dependência implícita, documentar).
- **Enumeração prod:** `/.env`→404, `/.git/HEAD`→404, `/src/main.js`→404, rota inexistente→404, métodos errados→405.
- **Mobile:** inputs 16px, botões 48px, form sticky (`style.css` + e2e Pixel 5 verde).
- **Baseline funcional:** 18 unit + 6 e2e (mobile+desktop) + build verdes.

## 3. Divulgação honesta (poluição do QA em produção)
Este QA gerou **3 eventos** nos logs/contadores de produção (IP do executor): 1 `check` errado (`qa-sonda-errada`), 1 `check` correto (id 1, teste fail-open) e 1 `unlock` com chave fabricada. Desconsiderar no travômetro do Vídeo 2. Rate budget usado: 3/10 — nenhum 429 foi provocado em prod.

## 4. Pós-lançamento (recorrência sugerida)
Re-rodar §8 a cada deploy + `npm audit` mensal; alertar em pico de `429`, `unlock` sem `check` prévio, `id` fora de range e body >1KB repetido (sinais de Burp, cf. `docs/OPERACAO.md`).

## 5. Checklist pré-Vídeo 1 (ordem de execução)
- [x] Fixes no repo aplicados em 03/10/2026 (commit pendente): fail-closed sem env em prod (`api/_lib.js` `isProd/missingProdEnv`, `check`/`unlock` → 500) + 7 testes novos em `tests/unit/sec.test.js` (25/25 verdes) — itens 1, 2, 10
- [x] `clientIp` anti-spoof (`x-real-ip`, senão último token XFF) — item 2
- [x] `Retry-After: 60` no 429; `CDN-Cache-Control` + `Vercel-CDN-Cache-Control: no-store` no `vercel.json` — itens 6, 10
- [x] Flag 3 com Espelho canônico (`index.html` H2 + `docs/ENIGMA.md`) — item 5
- [x] Leak-check funcional + prereq `npx playwright install` (`docs/OPERACAO.md`, `.agent/AGENTS.md`, `README.md`) — itens 4, 8
- [ ] Configurar envs prod no projeto B (`RESP_HASH_*`, `FRAG_*` **novos**, `CARTA_TEXT`, `ADMIN_TOKEN`, `IP_SALT`) — item 1
- [ ] Re-rodar sondas §8 contra prod e confirmar frag novo ≠ público — item 1
- [ ] Rewrites `/five-k-game/*` no portfólio + teste em aba anônima — item 7
- [ ] `npm i -D vitest@^4 vite@^7` + suítes verdes — item 3
- [ ] QA mobile 15min (`docs/OPERACAO.md` §6) via domínio final — item 7

## 6. Apêndice — reprodução
Harness (handlers reais, sem servidor): `qaharness.mjs` (42 asserts: contrato, XFF-spoof, oráculo `falta`, consistência puzzle↔hashes, PII em logs, timing) e `qaharness2.mjs` (fail-open sem env, stats sem token, `Retry-After`, isolamento de buckets) — arquivados fora do repo (temp do executor). Sondas prod: `curl -sI /`, `curl /api/headers`, `curl /api/stats`, `POST /api/check`, `POST /api/unlock`, `/.env`, `/.git/HEAD`, `/src/main.js`.
