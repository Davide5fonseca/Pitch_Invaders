// Efeitos de ecrã das câmaras: GoPro (REC), vinheta da cabeça, cansaço e "atrás de ti".
import { game, world, view, camMode, firstPerson, relControls, inGame } from '../state.js';
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
}
