# Invasão de Campo 3D

Salta para o relvado e foge aos seguranças o máximo de tempo possível.
Selfies com o craque, golos e cada segundo em campo dão pontos.

## Correr

```bash
npm install      # só da primeira vez
npm run dev      # abre o jogo no browser e recarrega sozinho quando mudas o código
npm run build    # gera a versão final em dist/
```

## Publicar no Netlify

O `netlify.toml` já tem tudo configurado (build `npm run build`, pasta `dist`).
Ligar o repositório Git ao Netlify, ou arrastar a pasta `dist/` para app.netlify.com/drop.

## Estrutura

```
index.html              página (HUD, menus) — carrega src/main.js
public/models/          modelo 3D dos bonecos (Xbot, com animações)
src/
  main.js               arranque e ciclo do jogo (~60x por segundo)
  config.js             números para afinar: velocidades, pontos, câmaras
  state.js              estado partilhado (game, view, world)
  utils.js              funções pequenas reutilizadas
  style.css
  world/                estádio e texturas desenhadas em código
  entities/             bonecos: character (modelo/animação), invader, players, stewards, ball
  systems/              renderer, camera, input, audio, game (regras)
  ui/                   hud, menus, minimap, floats (textos), screenfx (efeitos das câmaras)
legacy/                 versões antigas num só ficheiro (2D e 3D)
```

Para mudar a dificuldade, começa por `src/config.js`.
