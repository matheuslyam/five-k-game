# ENIGMA — descoberta do zero (sem respostas)

> Este arquivo pode ser público. Contém H1/H2 apenas.
> H3 forte sai só no Vídeo 2. Respostas reais nunca ficam aqui (só em `.env` prod).

Formato global: sempre `5k{...}`. Normalize: `trim().toLowerCase()`.
Ordem 1-4 livre. Final bloqueada até 4/4. Progresso em `localStorage` + recuperação por re-colar frag.

## Flag 0 — Tutorial (vitória <60s)

- **Vê:** campo já preenchido `5k{bem-vindo}` + Validar.
- **Faz:** clica Validar -> confete + `0/5, entendi o loop`.
- **Ensina:** onde digita, feedback instantâneo, formato.
- **Anti-softlock:** sem essa vitória o restante parece difícil. Obrigatória.

## Flag 1 — Hash

- **Objetivo aprendizado:** hash não reverte, testa chute.
- **Vê:** `SHA-256: <hex>` + "descubra a palavra" + H1 "está no audit 08".
- **Passo zero:**
  1. Abre audit 08, lista palavras candidatas.
  2. Cola candidata no input, Validar.
  3. Se ok, recebe `FRAG_1` e marca `1/5`.
- **H1:** a palavra está no audit 08. O que a sessão finge fazer?
- **H2:** como testar chute? CyberChef / `echo -n "chute" | sha256sum` / campo do jogo.
- **Anti-IA:** hash sozinho não reverte via prompt. IA manda usar wordlist genérica. Quem viu o vídeo resolve em ~30s.
- **Mobile:** input texto comum, sem ferramenta extra.

## Flag 2 — Salt

- **Objetivo:** mesma senha + sal diferente = hash diferente. Ordem `senha+sal` importa.
- **Vê:** `senha=<visível> | sal1=<visível> -> hash1 | sal2=?? escondido -> hash2` + selo da casa com imagem.
- **Passo zero:**
  1. Vasculha a página (inclusive o `alt` da imagem do selo) ou usa o botão Espelho e acha `sal2`.
  2. Entende ordem de concatenação pela dica H2.
  3. Digita `sal2`, Validar -> `FRAG_2`.
- **H1:** o sal2 está nesta página, não no vídeo. Imagens também falam.
- **H2:** tente `senha+sal` nessa ordem, tudo minúsculo.
- **Anti-IA:** não é "o que é salt?", é "ache aqui". Colar no GPT sem o valor extraído não resolve.
- **Mobile:** sem view-source no in-app — o botão Espelho busca o HTML e mostra o esconderijo na tela.

## Flag 3 — Header (canônica do audit 09)

- **Objetivo:** resposta está em volta da página (protocolo), não no HTML.
- **Vê:** "não está na página, está em volta dela" + "cada tentativa custa algo".
- **Passo zero PC:** botão **Espelho** (`GET /api/headers`) mostra o valor oficial na tela. Alternativa: DevTools -> Network -> recarrega -> clica documento -> Headers -> acha `X-Flag` (nem sempre aparece atrás do proxy — Espelho é o canônico).
- **Passo zero mobile:** botão **Espelho** (`GET /api/headers`) mostra JSON na tela + tutorial Kiwi/Chrome desktop. Sem espelho, 90% trava.
- **H1:** em volta = headers HTTP. O audit 09 dá o nome do custo.
- **H2:** Network + recarregar + procurar `X-Flag`. No celular, use Espelho.
- **Anti-IA:** IA não tem browser do usuário. Só dá tutorial, não o valor.
- **Infra:** `X-Flag` servido via `/api` (nunca `vercel.json`), `no-store`. Testar via domínio final através do proxy. Se não sobreviver, Espelho vira canônico.

## Flag 4 — Cookie (2 passos, eco audit 02 + audit 07)

- **Objetivo:** cookie + base64 decode + nomear o golpe. Decodificar é só o passo 1.
- **Vê:** dica audit 02 + "`document.cookie` tem algo" + aviso de que o decodificado é pista, não resposta.
- **Passo zero:** Application/Storage -> Cookies -> copia `sessao=...` -> decodifica (`atob()` no console / CyberChef) -> lê a pista -> responde com o nome do golpe em inglês (audit 07) -> `FRAG_4`.
- **Mobile:** Espelho mostra `document.cookie` + botão copiar + link decodificador.
- **H1:** olhe os cookies.
- **H2:** decodifique o base64, depois pergunte ao audit 07 como se chama esse golpe em inglês.
- **Anti-IA:** trivial após extrair, impossível antes. Colar a pista sem o vídeo não resolve.

## Flag 5 — Final

- **Vê:** 4 slots + campo chave + "falta: N".
- **Faz:** monta `frag1-frag2-frag3-frag4` -> Desbloquear -> carta se escreve (typewriter) -> vídeo aparece ao concluir.
- **Regras:** mostra qual falta, permite re-colar frag se limpou storage, normalize igual às outras. Carta + vídeo persistem para rever.
- **Gate anti-pulo:** mesmo com 1 frag vazado, precisa das 4. Gabarito total vazado é inevitável sem auth — mitigado por moderação manual + frags alta entropia (não chutáveis).

## Calibragem medium

Alvo: 10-25min total, 2-5min por flag, 1 ferramenta nova por flag.
Ajuste dinâmico via H1/H2/H3, não via dificuldade fixa.
Travômetro: flag com mais `fail` no KV vira hint forte do Vídeo 2.
