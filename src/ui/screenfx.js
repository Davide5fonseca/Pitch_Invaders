// Efeitos de ecrã das câmaras: GoPro (REC), vinheta da cabeça, cansaço e "atrás de ti".
import { game, world, view, camMode, firstPerson, relControls, inGame } from '../state.js';
import * as THREE from 'three';
import { camera } from '../systems/renderer.js';
import { $, clamp, dist, pad2, forward } from '../utils.js';

function timecode(t) {
  return `${pad2(Math.floor(t / 60))}:${pad2(Math.floor(t % 60))}:${pad2(Math.floor(t % 1 * 30))}`;
}

export function updateScreenFx() {
  const fp = inGame() && firstPerson(), id = camMode().id;
  $('gopro').classList.toggle('hidden', !(fp && id === 'peito'));
  if (fp && id === 'peito') $('tc').textContent = timecode(game.time);
  $('vig').style.opacity = fp && id === 'cabeca' ? 0.55 : 0;
  $('tired').style.opacity = fp && game.state === 'play'
    ? clamp((35 - game.stamina) / 35, 0, 1) * (0.45 + Math.sin(performance.now() / 160) * 0.15)
    : 0;

  // Aviso quando um segurança está perto e fora da tua vista
  let behind = false;
  if (game.state === 'play' && relControls()) {
    const f = forward(view.yaw), inv = world.invader;
    for (const s of world.stewards) {
      if (!s.active) continue;
      const d = dist(s, inv);
      if (d < 6 && ((s.x - inv.x) * f.x + (s.z - inv.z) * f.z) / d < 0.35) behind = true;
    }
  }
  $('warn').classList.toggle('hidden', !behind);
  updateRonaldoArrow();
}

// Seta na borda do ecrã a apontar para o Ronaldo quando ele está fora da vista
const v = new THREE.Vector3();
function updateRonaldoArrow() {
  const el = $('ronArrow'), star = world.star;
  if (game.state !== 'play' || !star || star.cool > 0) { el.classList.add('hidden'); return; }
  v.set(star.x, 1.8, star.z).applyMatrix4(camera.matrixWorldInverse);
  const behindCam = v.z > 0;                       // atrás da câmara
  v.applyMatrix4(camera.projectionMatrix);
  let x = v.x, y = v.y;
  if (!behindCam && Math.abs(x) < 1 && Math.abs(y) < 1) { el.classList.add('hidden'); return; }   // está à vista
  if (behindCam) { x = -x; y = -y; }
  // Leva o ponto até à borda (com margem), mantendo a direção a partir do centro
  const k = 1 / Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.78, 1e-6);
  x *= k; y *= k;
  const px = (x + 1) / 2 * innerWidth, py = (1 - y) / 2 * innerHeight;
  el.classList.remove('hidden');
  el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
  el.querySelector('.ar').style.transform = `rotate(${Math.atan2(-y * innerHeight, x * innerWidth)}rad)`;
}
