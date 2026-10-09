// Regras do jogo: começar, pontuar (selfies, golos, dribles, TV), aparecer seguranças e ser apanhado.
import { game, world, score, camMode } from '../state.js';
import { STEWARDS, SCORE } from '../config.js';
import { $, dist, storageSet, isTouch } from '../utils.js';
import { audio, beep, whistle, crowdGoal, crowdCheer, crowdOoh, crowdBoo } from './audio.js';
import { lockMouse, unlockMouse, releaseAll } from './input.js';
import { moveZone } from './broadcast.js';
import { track } from './analytics.js';
import { resetInvader, updateInvader, startDash } from '../entities/invader.js';
import { starRunAway } from '../entities/players.js';
import { spawnSteward, clearStewards, updateStewards } from '../entities/stewards.js';
import { resetBall, updateBall } from '../entities/ball.js';
import { showHud, flash, toast } from '../ui/hud.js';
import { hideOverlay, showGameOver } from '../ui/menus.js';
import { float } from '../ui/floats.js';

let firstGame = true;

// Vibração curta no telemóvel (Android; o iPhone ignora)
const buzz = ms => { try { navigator.vibrate?.(ms); } catch (e) {} };

// No telemóvel, joga em ecrã inteiro (tem de ser pedido num toque do jogador)
function goFullscreen() {
  if (!isTouch() || document.fullscreenElement) return;
  const el = document.documentElement;
  try { const p = el.requestFullscreen?.({ navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}

function reset() {
  resetInvader();
  clearStewards();
  resetBall();
  world.star.cool = 0;
  Object.assign(game, {
    time: 0, selfies: 0, goals: 0, dodges: 0, tvPoints: 0, live: false,
    spawnT: 0, spawnCount: 0, stamina: 100, dashT: 0, dashCd: 0, shake: 0,
  });
  for (let i = 0; i < STEWARDS.startCount; i++) spawnSteward();
  moveZone();
}

export function tryStart() {
  if (game.state === 'over' && performance.now() - game.overAt < 700) return;
  audio();
  reset();
  game.state = 'play';
  track('start', { camera: camMode().id });
  hideOverlay();
  showHud(true);
  $('touch').classList.toggle('hidden', !isTouch());
  goFullscreen();
  lockMouse();
  crowdCheer(0.9);                             // o público vibra quando entras em campo
  if (firstGame) {
    toast(isTouch()
      ? `🕹️ Joystick à esquerda · FINTA à direita · ⭐ corre até ao Ronaldo!`
      : `⭐ Corre até ao Ronaldo para a selfie · 📺 no círculo vermelho apareces no ecrã gigante`);
    firstGame = false;
  }
}

function gameOver() {
  game.state = 'over';
  game.overAt = performance.now();
  game.live = false;
  unlockMouse();
  releaseAll();
  $('touch').classList.add('hidden');
  showHud(false);
  buzz([80, 60, 200]);
  whistle();
  setTimeout(crowdBoo, 250);
  game.shake = 0.4;
  world.invader.vx = world.invader.vz = 0;
  const sc = score(), record = sc > game.best;
  track('end', { time: game.time, score: sc, camera: camMode().id });
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
  float(`+${SCORE.selfie} SELFIE COM O RONALDO! 📸`, star.x, star.z, '#ffd166');
  setTimeout(() => float('SIUUU!', star.x, star.z, '#ffd166', true), 350);
  beep(880, 0.08); setTimeout(() => beep(1320, 0.12), 80);
  crowdCheer(0.6);
  starRunAway(invader);
  buzz(25);
  spawnSteward();
}

function onGoal() {
  const { ball } = world;
  game.goals++;
  float(`GOLOOOO! +${SCORE.goal}`, ball.x, ball.z, '#7cf29c', true);
  crowdGoal();
  game.shake = 0.6;
  game.celebrate = 2.5;
  buzz([40, 40, 40]);
  resetBall();
  spawnSteward();
}

function onDodge(n) {
  game.dodges += n;
  const inv = world.invader;
  float(`DRIBLE! +${SCORE.dodge * n}`, inv.x, inv.z, '#8ecae6');
  crowdOoh();
  buzz(30);
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
  const { caught, dodged } = updateStewards(dt, game.dashT > 0);
  if (caught) gameOver();
  else if (dodged) onDodge(dodged);
}
