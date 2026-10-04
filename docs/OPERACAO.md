# OPERACAO — deploy, envs, logs, segurança

> Público: autor/operador. Não contém respostas reais, só nomes de vars.
> Repo: https://github.com/matheuslyam/five-k-game.git
> Stack: Vite (decidido). `vercel.json` mínimo do projeto B já existe neste repo.

## 1. Projetos Vercel

- **A `portfolio`** — dono de `lyam.dev.br`. Contém `vercel.json` com rewrites.
- **B `five-k-game`** — TODO: criar na Vercel a partir deste repo. URL final ex: `https://five-k-game.vercel.app`. Contém o jogo + `/api`.
  - Status: desbloqueado — `vercel.json` com headers genéricos + `no-store` já commitado neste repo.

### 1.1 Rewrite no portfólio (replicar padrão knight)

No `vercel.json` do portfólio:

```json
{
  "rewrites": [
    { "source": "/five-k-game", "destination": "https://five-k-game.vercel.app/" },
    { "source": "/five-k-game/", "destination": "https://five-k-game.vercel.app/" },
    { "source": "/five-k-game/:path*", "destination": "https://five-k-game.vercel.app/:path*" }
  ],
  "redirects": [
    { "source": "/five-k-game", "destination": "/five-k-game/", "permanent": true }
  ]
}
```

Regras:

- Linkar sempre com `/` final: `<a href="/five-k-game/">jogar</a>`.
- Redeploy do portfólio após editar. Só funciona em prod, dev local ignora.
- Jogo (Vite): `vite.config.ts` com `base: './'`, senão assets resolvem para `/assets/...` fora do proxy e dá tela branca.

### 1.2 Headers do jogo (projeto B)

No `vercel.json` do jogo (já existe versão mínima neste repo):

- TODO: `X-Flag` real NÃO vai em `vercel.json` (repo público = vazamento). Servir valor real via `/api` lendo `.env`. Manter em `vercel.json` só headers genéricos.
- `Cache-Control: no-store` em `/api/*` e na página do desafio (senão edge cache mata o header) — já configurado no `vercel.json` atual.
- Segurança: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'self'; script-src 'self'` — já configurado.
- TODO: testar em prod via domínio final `lyam.dev.br/five-k-game/` em aba anônima: Network -> Headers. Se `X-Flag` não sobreviver ao proxy, o canônico mobile passa a ser `GET /api/headers` (espelho JSON).
- TODO: criar projeto B na Vercel, ligar KV, configurar envs prod (ver seção 2).

## 2. Envs (nomes, sem valores)

Nunca commitar. Só `.env` local + Vercel env prod (projeto B). `.env.example` tem fakes.

```
RESP_HASH_1, RESP_HASH_2, RESP_HASH_3, RESP_HASH_4  # sha256(normalize(resposta)), hex
FRAG_1, FRAG_2, FRAG_3, FRAG_4                      # 16 hex aleatórios cada (node -e abaixo)
CARTA_TEXT                                          # plaintext da carta (server-only)
ADMIN_TOKEN                                         # para GET /api/stats
IP_SALT                                             # salt para hash de IP nos logs (rode periodicamente)
HEADER_FLAG                                         # resposta da Flag 3 (valor do X-Flag/Espelho)
COOKIE_B64                                          # resposta da Flag 4 em base64 (valor do cookie sessao)
```

Na Vercel (projeto B → Settings → Environment Variables): cadastre todas com Environment `Production` apenas (Preview gera URLs públicas por PR — não exponha segredos lá) e marque `Sensitive`. Env só vale após **redeploy** (Deployments → Redeploy). Sem essas envs, o deploy com o fix do QA nega `check`/`unlock` com 500 de propósito (fail-closed) — ver `docs/QA-SEGURANCA.md` item 1.

Geração frag (exemplo local, rode uma vez e guarde):

```bash
node -e "console.log([...Array(4)].map(()=>require('crypto').randomBytes(8).toString('hex')).join('\n'))"
```

Rotação se vazar gabarito: gere novos `FRAG_*` + novo `CARTA_TEXT` se necessário, redeploy projeto B. Front não muda (recebe frag via `/api`).

Pré-push check obrigatório (casa NOMES de segredo — o label de UI `FRAG_` é legítimo e não entra aqui):

```bash
grep -rE "CARTA_TEXT|RESP_HASH_|ADMIN_TOKEN|IP_SALT|VITE_" dist/ src/ index.html && echo "VAZOU - nao de push" || echo "limpo"
```

Deve retornar `limpo`. Se retornar match, não dê push (repo é público).

## 3. API — contrato + ordem barata -> cara

### `POST /api/check {id:1-4, guess:string}`

Ordem:

1. Method `POST` apenas, same-origin, body `<=1KB` (JSON). Senão `4xx` direto.
2. KV rate-limit `10/min/IP` (Vercel KV/Upstash). Estourou -> `429` direto, sem crypto.
3. Shape: `id in 1..4`, `guess string 1..100`. Senão `400`.
4. Só então: `normalize(guess) = trim().toLowerCase()`, `sha256`, `timingSafeEqual` com `RESP_HASH_*`.
5. Retorno: `{ok:true, frag}` ou `{ok:false}` genérico (sem "quase", sem primeira letra).

Nunca usar rate-limit in-memory (bypass multinstância serverless).

### `POST /api/unlock {frags:[s1,s2,s3,s4]}`

Valida 4 no server (constant-time), retorna `{ok:true, carta}` ou `{ok:false, falta:[ids]}`. Carta nunca vai no bundle.

### `GET /api/headers`

Espelho mobile: retorna headers relevantes em JSON na tela. `no-store`.

### `GET /api/stats?token=ADMIN_TOKEN`

Interno, só autor. Retorna `{1:{ok,fail},2:{...},429:n}` para travômetro do Vídeo 2.

## 4. Logs / observabilidade mínima

- Uma linha JSON por request: `{t, route, id, ok, ipHash, ua20, ms, limited}`.
- `ipHash = sha256(ip + IP_SALT).slice(0,12)`. Nunca IP cru (LGPD).
- Nunca logar: `guess` cru, `frag`, carta, `.env`. Logar só `len` + `hashPrefix = sha256(guess).slice(0,8)`.
- Sem `console.log` de segredo. Erro 500 genérico, sem stack trace.
- Onde ver: Vercel Dashboard -> Runtime Logs + KV contadores. Retenção free basta para ciclo de 3 vídeos.
- Footer do jogo: "logs anônimos de jogabilidade".

Sinais de Burp/intruder: pico `429`, `unlock` sem `check` prévio, `id` fora de range, body >1KB repetido.

## 5. Segurança — checklist pré-deploy

- [ ] Zero segredo no bundle, HTML, comentário, source map. Maps off.
- [ ] `.env` só lido em `/api`, nunca importado no front (`NEXT_PUBLIC_`/`VITE_` proibidos para segredo).
- [ ] Render com `textContent`, nunca `innerHTML` com `guess`/`nick`/`frag`/`carta`.
- [ ] CSP + nosniff + DENY + no-referrer ativos.
- [ ] Cookie `sessao=` exceção documentada: precisa ser legível via JS para o puzzle. `SameSite=Lax`, sem dado real, valor só do jogo.
- [ ] Validação de shape antes de crypto. Erro genérico.
- [ ] `.gitignore` com `.env`, `.vercel`, `dist/`. `.git/` nunca deployado.

## 6. QA 15min pós-subir

1. Chrome Android + Safari iOS + aberto de dentro do Instagram.
2. Avião on/off no meio de flag.
3. Resposta em MAIÚSCULA, com espaços nas pontas e minúscula passam igual.
4. Limpa storage/cookies — dá para re-colar frag e continuar.
5. Teclado aberto não esconde Validar (sticky bottom, `100dvh`).
6. Header via domínio final em anônima.
7. `POST /api/check` com body gigante -> 400/413 rápido, sem lentidão.
