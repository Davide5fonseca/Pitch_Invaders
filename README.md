# Pitch Invaders

Salta para o relvado e foge aos seguranças o máximo de tempo possível.
Pontos por cada segundo em campo, selfies com o craque, golos, dribles aos seguranças
que se atiram a ti e tempo de antena no ecrã gigante. Tabela de recordes online.

Jogo publicado em https://improvee.pt (Netlify, ligado a este repositório).

## Correr

```bash
npm install      # só da primeira vez
npm run dev      # abre o jogo no browser e recarrega sozinho quando mudas o código
npm run build    # gera a versão final em dist/
```

Em `npm run dev` a tabela de recordes aparece como "indisponível": a função só corre no Netlify.

## Publicar no Netlify

O `netlify.toml` já tem tudo configurado (build `npm run build`, pasta `dist`, funções em `netlify/functions`).
Cada push para `main` publica o site automaticamente.

## Estrutura

```
index.html              página (HUD, menus) — carrega src/main.js
public/models/          modelo 3D dos bonecos (Xbot da Mixamo, com animações)
netlify/functions/      scores.mjs — API da tabela de recordes (/api/scores, guarda no Netlify Blobs)
src/
  main.js               arranque e ciclo do jogo (~60x por segundo)
  config.js             números para afinar: velocidades, pontos, mergulho, câmaras
  state.js              estado partilhado (game, view, world)
  utils.js              funções pequenas reutilizadas
  style.css
  world/                estádio e texturas desenhadas em código
  entities/
    character.js        bonecos: modelo, animação, número nas costas, inclinação do mergulho
    kits.js             equipamentos, tons de pele/cabelo e o shader que "veste" o modelo
    invader.js          tu
    players.js          as duas equipas, o craque nº 10 e o árbitro
    stewards.js         seguranças e polícia (perseguição e mergulho)
    ball.js
  systems/
    renderer.js         motor 3D, luzes, lente GoPro
    camera.js           câmaras TV / Ombro / GoPro / Cabeça
    broadcast.js        câmara de TV, círculo "em direto" e ecrãs gigantes
    game.js             regras e pontuação
    input.js, audio.js, leaderboard.js
  ui/                   hud, menus (com a tabela), minimap, floats (textos), screenfx
legacy/                 versões antigas num só ficheiro (2D e 3D)
```

Para mudar a dificuldade, começa por `src/config.js`. Para mudar equipamentos, `src/entities/kits.js`.
