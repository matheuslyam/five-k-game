# ENIGMA — dicas (espelho do jogo)

Formato global: sempre `5k{...}`. Ordem 1-4 livre.
Progresso em `localStorage` + recuperação por re-colar frag.

## Flag 0 — Tutorial

Campo já preenchido `5k{bem-vindo}` + Validar.

## Flag 1 — Hash

Descubra a palavra. Dica 1: está no audit 08.

- **Dica 1:** A palavra está no audit 08. O que a sessão finge fazer?
- **Dica 2:** Teste seu chute aqui mesmo, ou compare com `echo -n "chute" | sha256sum` / CyberChef.

## Flag 2 — Salt

Mesma senha, dois hashes diferentes. Qual é o sal escondido?

- **Dica 1:** O sal2 está nesta página, não no vídeo. Imagens também falam.
- **Dica 2:** A ordem é `senha+sal`, tudo minúsculo, sem espaços.
- Botão **Ver esconderijo (Espelho)** na página.

## Flag 3 — Header

A resposta não está na página, está *em volta* dela.
Relembre o audit 09: cada tentativa custa algo. O quê?

- **Dica 1:** Em volta = headers HTTP da resposta. O audit 09 dá o nome do custo.
- **Dica 2:** Jeito garantido: use o **Espelho** abaixo — ele mostra o valor oficial. No PC, também dá para tentar DevTools → Network → recarregar → Headers → `X-Flag`, mas atrás do proxy o header nem sempre aparece no documento.
- Botão **Ver pelo Espelho (mobile)** na página.

## Flag 4 — Cookie

Eco do audit 02: `document.cookie` tem algo. Mas decodificar é só o primeiro passo.

- **Dica 1:** Olhe os cookies (Application → Cookies no PC).
- **Dica 2:** Copie o valor após `sessao=` e decodifique base64 (`atob()` no console / CyberChef). O que sai é uma pista, não a resposta: o nome do golpe, em inglês, está no audit 07.
- Botão **Ver pelo Espelho (mobile)** na página.

## Final

Monte `frag1-frag2-frag3-frag4` e desbloqueie.
Se limpou o navegador, cole os 4 frags para continuar.
