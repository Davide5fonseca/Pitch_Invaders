// Regras do jogo: começar, pontuar (selfies, golos), aparecer seguranças e ser apanhado.
import { game, world, score } from '../state.js';
import { STEWARDS, SCORE } from '../config.js';
import { dist, storageSet } from '../utils.js';
import { audio, ambience, beep, roar, whistle } from './audio.js';
import { lockMouse, unlockMouse, pointer } from './input.js';
import { resetInvader, updateInvader, startDash } from '../entities/invader.js';
import { starRunAway } from '../entities/players.js';
import { spawnSteward, clearStewards, updateStewards } from '../entities/stewards.js';
import { resetBall, updateBall } from '../entities/ball.js';
import { showHud, flash } from '../ui/hud.js';
import { hideOverlay, showGameOver } from '../ui/menus.js';
import { float } from '../ui/floats.js';

function reset() {
  resetInvader();
  clearStewards();
  resetBall();
  world.star.cool = 0;
  Object.assign(game, {
    time: 0, selfies: 0, goals: 0, spawnT: 0, spawnCount: 0,
    stamina: 100, dashT: 0, dashCd: 0, shake: 0,
  });
  for (let i = 0; i < STEWARDS.startCount; i++) spawnSteward();
}

export function tryStart() {
  if (game.state === 'over' && performance.now() - game.overAt < 700) return;
  audio(); ambience();
  reset();
  game.state = 'play';
  hideOverlay();
  showHud(true);
  lockMouse();
  roar(2);
}

function gameOver() {
  game.state = 'over';
  game.overAt = performance.now();
  unlockMouse();
  pointer.active = false;
  whistle();
  game.shake = 0.4;
  world.invader.vx = world.invader.vz = 0;
  const sc = score(), record = sc > game.best;
  if (record) { game.best = sc; storageSet('invasao3d-best', sc); }
  showGameOver(sc, record);
}

export function dash() {
  if (game.state === 'play' && startDash()) beep(520, 0.12, 'triangle', 0.08);
}

function trySelfie() {
  const { star, invader } = world;
  if (star.cool > 0 || dist(invader, star) >= 1.5) return;
  game.selfies++;
  star.cool = 2.5;
  flash();
  float(`+${SCORE.selfie} SELFIE! 📸`, star.x, star.z, '#ffd166');
  beep(880, 0.08); setTimeout(() => beep(1320, 0.12), 80);
  starRunAway(invader);
  spawnSteward();
}

function onGoal() {
  const { ball } = world;
  game.goals++;
  float(`GOLOOOO! +${SCORE.goal}`, ball.x, ball.z, '#7cf29c', true);
  roar(2.5);
  game.shake = 0.6;
  game.celebrate = 2.5;
  resetBall();
  spawnSteward();
}

export function updatePlay(dt) {
  game.time += dt;
  game.dashCd = Math.max(0, game.dashCd - dt);
  world.star.cool = Math.max(0, world.star.cool - dt);

  updateInvader(dt);
  trySelfie();
  if (updateBall(dt)) onGoal();

  game.spawnT += dt;
  if (game.spawnT > STEWARDS.spawnEvery) { game.spawnT = 0; spawnSteward(); }
  if (updateStewards(dt, game.dashT > 0)) gameOver();
}
