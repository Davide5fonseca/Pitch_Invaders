// Arranque e ciclo principal do jogo.
import './style.css';
import { render } from './systems/renderer.js';
import { game, view, world, inGame, firstPerson, relControls, camMode } from './state.js';
import { buildStadium, updateCrowd } from './world/stadium.js';
import { loadModel, place } from './entities/character.js';
import { buildPlayers, updatePlayers } from './entities/players.js';
import { buildStewards, stopStewards } from './entities/stewards.js';
import { buildInvader } from './entities/invader.js';
import { buildBall, placeBall } from './entities/ball.js';
import { initInput } from './systems/input.js';
import { updateCamera, setCamMode, updateCamButton } from './systems/camera.js';
import { tryStart, dash, updatePlay } from './systems/game.js';
import { updateHud } from './ui/hud.js';
import { drawMap } from './ui/minimap.js';
import { showMenu } from './ui/menus.js';
import { updateFloats } from './ui/floats.js';
import { updateScreenFx } from './ui/screenfx.js';

let last = performance.now();

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.shake = Math.max(0, game.shake - dt);
  game.celebrate = Math.max(0, game.celebrate - dt);

  if (game.state !== 'loading') {
    if (game.state === 'play') updatePlay(dt);
    else stopStewards();
    updatePlayers(dt);

    // Pôr cada boneco no sítio e animá-lo
    const { invader, star, starRing } = world;
    invader.ch.root.visible = inGame() && !firstPerson();   // na 1ª pessoa não vês o teu corpo
    const look = inGame() ? invader : world.ball;
    for (const n of world.npcs) place(n, dt, look);
    for (const s of world.stewards) if (s.active) place(s, dt, invader);
    if (inGame()) place(invader, dt, null, relControls() ? view.yaw : undefined);
    placeBall(dt);

    starRing.visible = star.cool === 0;
    starRing.scale.setScalar(1 + Math.sin(now / 180) * 0.12);
    updateCrowd(now, game.celebrate > 0);

    if (game.state === 'play') { updateHud(); drawMap(); }
    updateScreenFx();
  }

  updateCamera(dt);
  updateFloats(dt);
  render(camMode().id === 'peito' && inGame());
}

initInput({ start: tryStart, dash, cycleCamera: () => setCamMode(view.camMode + 1) });
updateCamButton();
buildStadium();
requestAnimationFrame(loop);

world.xbot = await loadModel();
buildPlayers();
buildInvader();
buildStewards();
buildBall();
game.state = 'menu';
showMenu();
