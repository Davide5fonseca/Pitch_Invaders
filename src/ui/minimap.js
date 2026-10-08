// Mini-mapa no canto inferior direito.
import { world } from '../state.js';
import { HL, HW, GOAL_W, COLORS } from '../config.js';
import { $, clamp } from '../utils.js';

const ctx = $('map').getContext('2d');
const S = 2, O = 8, W = 226, H = 152;      // 2 px por metro, 8 px de margem
const px = x => clamp(O + (x + HL) * S, 2, W - 2);
const pz = z => clamp(O + (z + HW) * S, 2, H - 2);

function dot(e, r, color, stroke) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(px(e.x), pz(e.z), r, 0, Math.PI * 2); ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}

export function drawMap() {
  const { npcs, star, ball, stewards, invader } = world;
  const g = ctx;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(40,120,50,.85)'; g.fillRect(O, O, 105 * S, 68 * S);
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1;
  g.strokeRect(O, O, 105 * S, 68 * S);
  g.beginPath(); g.moveTo(px(0), O); g.lineTo(px(0), O + 68 * S); g.stroke();
  g.beginPath(); g.arc(px(0), pz(0), 9.15 * S, 0, Math.PI * 2); g.stroke();
  g.strokeRect(O - 4, pz(-GOAL_W), 4, GOAL_W * 2 * S);
  g.strokeRect(O + 105 * S, pz(-GOAL_W), 4, GOAL_W * 2 * S);

  for (const n of npcs) if (n !== star) dot(n, 2, 'rgba(255,255,255,.35)');
  dot(star, 3.5, star.cool === 0 ? '#ffd166' : '#8a7440');
  dot(ball, 2.2, '#fff');
  for (const s of stewards) if (s.active) dot(s, 3, s.police ? '#5b8cff' : '#ffcc00', '#000');

  // Cone de visão do invasor
  const a = Math.atan2(Math.cos(invader.heading), Math.sin(invader.heading));
  g.fillStyle = 'rgba(193,75,255,.35)';
  g.beginPath(); g.moveTo(px(invader.x), pz(invader.z));
  g.arc(px(invader.x), pz(invader.z), 22, a - 0.5, a + 0.5); g.closePath(); g.fill();
  dot(invader, 4, COLORS.invader, '#fff');
}
