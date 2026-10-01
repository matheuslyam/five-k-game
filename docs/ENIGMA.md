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
- **Vê:** `SHA-256: <hex>` + "descubra a palavra" + H1 "está no audit 03".
- **Passo zero:**
  1. Abre audit 03, lista palavras candidatas.
  2. Cola candidata no input, Validar.
  3. Se ok, recebe `FRAG_1` e marca `1/5`.
- **H1:** a palavra está no audit 03.
- **H2:** como testar chute? CyberChef / `echo -n "chute" | sha256sum` / campo do jogo.
- **Anti-IA:** hash sozinho não reverte via prompt. IA manda usar wordlist genérica. Quem viu o vídeo resolve em ~30s.
- **Mobile:** input texto comum, sem ferramenta extra.

## Flag 2 — Salt

- **Objetivo:** mesma senha + sal diferente = hash diferente. Ordem `senha+sal` importa.
- **Vê:** `senha=<visível> | sal1=<visível> -> hash1 | sal2=?? escondido -> hash2`.
- **Passo zero:**
  1. Vasculha a página (comentário HTML / alt de imagem) e acha `sal2`.
  2. Entende ordem de concatenação pela dica H2.
  3. Digita `sal2`, Validar -> `FRAG_2`.
- **H1:** o sal2 está nesta página, não no vídeo.
- **H2:** tente `senha+sal` nessa ordem, tudo minúsculo.
- **Anti-IA:** não é "o que é salt?", é "ache aqui". Colar no GPT sem o valor extraído não resolve.
- **TODO autor:** definir `senha/sal1/sal2` + esconderijo exato. Respostas curtas, sem acento.

## Flag 3 — Header

- **Objetivo:** resposta está em volta da página (protocolo), não no HTML.
- **Vê:** "não está na página, está em volta dela".
- **Passo zero PC:** DevTools -> Network -> recarrega -> clica documento -> Headers -> acha `X-Flag` -> cola -> `FRAG_3`.
- **Passo zero mobile:** botão **Espelho** (`GET /api/headers`) mostra JSON na tela + tutorial Kiwi/Chrome desktop. Sem espelho, 90% trava.
- **H1:** em volta = headers HTTP.
- **H2:** Network + recarregar + procurar `X-Flag`. No celular, use Espelho.
- **Anti-IA:** IA não tem browser do usuário. Só dá tutorial, não o valor.
- **Infra:** `X-Flag` setado no projeto do jogo, `no-store`. Testar via domínio final através do proxy. Se não sobreviver, Espelho vira canônico.
- **TODO autor:** definir valor `X-Flag`.

## Flag 4 — Cookie

- **Objetivo:** cookie + base64 decode. Eco audit 02.
- **Vê:** dica audit 02 + "`document.cookie` tem algo".
- **Passo zero:** Application/Storage -> Cookies -> copia `sessao=...` -> decodifica (`atob()` no console / CyberChef) -> cola -> `FRAG_4`.
- **Mobile:** Espelho mostra `document.cookie` + botão copiar + link decodificador.
- **H1:** olhe os cookies.
- **H2:** copie o valor após `sessao=` e decodifique base64.
- **Anti-IA:** trivial após extrair, impossível antes.
- **TODO autor:** definir valor `sessao`.

## Flag 5 — Final

- **Vê:** 4 slots + campo chave + "falta: N".
- **Faz:** monta `frag1-frag2-frag3-frag4` -> Desbloquear -> carta aparece.
- **Regras:** mostra qual falta, permite re-colar frag se limpou storage, normalize igual às outras.
- **Gate anti-pulo:** mesmo com 1 frag vazado, precisa das 4. Gabarito total vazado é inevitável sem auth — mitigado por moderação manual + frags alta entropia (não chutáveis).

## Calibragem medium

Alvo: 10-25min total, 2-5min por flag, 1 ferramenta nova por flag.
Ajuste dinâmico via H1/H2/H3, não via dificuldade fixa.
Travômetro: flag com mais `fail` no KV vira hint forte do Vídeo 2.
