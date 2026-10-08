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
import { buildBroadcast, updateBroadcast, renderLiveInset, zoneState } from './systems/broadcast.js';
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
    for (const s of world.stewards) {
      // A meio de um mergulho ou caído no chão, não roda para o invasor
      if (s.active) place(s, dt, invader, s.mode !== 'chase' ? s.heading : undefined);
    }
    if (inGame()) place(invader, dt, null, relControls() ? view.yaw : undefined);
    placeBall(dt);

    starRing.visible = star.cool === 0;
    starRing.scale.setScalar(1 + Math.sin(now / 180) * 0.12);
    updateCrowd(now, game.celebrate > 0);

    if (game.state === 'play') { updateHud(); drawMap(); }
    updateScreenFx();
    updateBroadcast(dt, now);
  }

  updateCamera(dt);
  updateFloats(dt);
  render(camMode().id === 'peito' && inGame());
  if (game.state !== 'loading') renderLiveInset();
}

// Só em desenvolvimento: acesso ao estado pela consola do browser (não vai para o site publicado)
if (import.meta.env.DEV) window.__game = { game, view, world, zone: zoneState };

initInput({ start: tryStart, dash, cycleCamera: () => setCamMode(view.camMode + 1) });
updateCamButton();
buildStadium();
requestAnimationFrame(loop);

world.xbot = await loadModel();
buildPlayers();
buildInvader();
buildStewards();
buildBall();
buildBroadcast();
game.state = 'menu';
showMenu();
