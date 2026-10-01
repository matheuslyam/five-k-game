# five-k-game — escondi 5 flags

Mini-game enigma estilo CTF para comemorar 5k follows no Instagram.

Jogue em: `https://lyam.dev.br/five-k-game/`
Repo público: `https://github.com/matheuslyam/five-k-game.git`

## Como jogar

1. Cada flag está no formato `5k{...}`.
2. Digite seu chute no campo da flag e clique Validar.
3. Só minúsculas, sem espaços no início/fim. `ARGON2`, ` Argon2 ` e `argon2` valem o mesmo.
4. Progresso salva no seu navegador (`x/5`). Ordem 1-4 é livre, a Final abre com 4/4.
5. Travou? Abra a dica H1, depois H2. A H3 forte sai no Vídeo 2.

Flag 0 tutorial vem preenchida com `5k{bem-vindo}` — valide para aprender o loop em <60s.

## No celular (90% do público)

- Use o botão **Espelho** quando a flag pedir DevTools (Header/Cookie). Ele mostra na tela o que o PC veria no Network/Application.
- No PC use Chrome DevTools normalmente. No celular, Kiwi Browser ou Chrome modo desktop ajudam.
- Teclado só abre com toque real. Se não abrir, toque de novo no campo (iOS bloqueia foco programático).

## Placar

Sem leaderboard dentro do jogo. Marque progresso com print/story e marque o autor.
Placar oficial aparece no Vídeo 2, hall da fama no Vídeo 3 (dia dos 5k).

## Rodar local (dev, sem segredos reais)

```bash
cp .env.example .env
# preencha com valores FAKE locais, nunca os reais de prod
npm i
npm run dev
```

Respostas reais vivem só em `.env` local + Vercel env de prod. Nunca são commitadas.

## Privacidade

Logs anônimos de jogabilidade (acerto/erro por flag, sem IP cru, sem chute cru). Ver `docs/OPERACAO.md`.

## Série

- V1 Lançamento: o que é CTF + hint Audit 03.
- V2 Meio: placar + hint da mais travada.
- V3 Solução: resolução + carta + nomes.

Ver desenho completo em `SPEC.md` e descoberta passo a passo em `docs/ENIGMA.md`.
