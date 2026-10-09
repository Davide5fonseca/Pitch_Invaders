// Mini-mapa no canto inferior direito.
// Só 4 cores com significado, cada uma com forma própria (lê-se também com daltonismo):
//   roxo = tu · dourado (estrela) = Ronaldo · vermelho (losangos) = perigo: seguranças e polícia
//   azul-claro (anel tracejado) = câmara de TV · tudo o resto (jogadores, árbitro, bola) fica neutro e discreto
import { world } from '../state.js';
import { HL, HW, GOAL_W, COLORS, BROADCAST } from '../config.js';
import { $, clamp } from '../utils.js';
import { zoneState } from '../systems/broadcast.js';

export const MAP_COLORS = {
  you: COLORS.invader,
  ronaldo: '#ffd166', ronaldoDone: 'rgba(255,209,102,.35)',   // depois da selfie fica apagado até poder repetir
  danger: '#ff4d5e', down: 'rgba(255,255,255,.3)',            // segurança caído deixa de ser perigo
  zone: '#4cc9f0',
  player: 'rgba(255,255,255,.38)', ball: '#ffffff',
};

const ctx = $('map').getContext('2d');
const S = 2, O = 8, W = 226, H = 152;      // 2 px por metro, 8 px de margem
const px = x => clamp(O + (x + HL) * S, 3, W - 3);
const pz = z => clamp(O + (z + HW) * S, 3, H - 3);

function outline(color, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }

function circle(e, r, fill, stroke, width) {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(px(e.x), pz(e.z), r, 0, Math.PI * 2); ctx.fill();
  if (stroke) outline(stroke, width);
}

function diamond(e, r, fill, stroke) {
  const x = px(e.x), y = pz(e.z);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
  outline(stroke, 1.2);
}

function star(e, r, fill, stroke) {
  const x = px(e.x), y = pz(e.z);
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  outline(stroke, 1);
}

export function drawMap() {
  const { npcs, star: ronaldo, ball, stewards, invader } = world;
  const g = ctx;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0d1a12'; g.fillRect(0, 0, W, H);                 // fundo opaco: nada do jogo aparece por trás
  g.fillStyle = '#25692f'; g.fillRect(O, O, 105 * S, 68 * S);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
  g.strokeRect(O, O, 105 * S, 68 * S);
  g.beginPath(); g.moveTo(px(0), O); g.lineTo(px(0), O + 68 * S); g.stroke();
  g.beginPath(); g.arc(px(0), pz(0), 9.15 * S, 0, Math.PI * 2); g.stroke();
  g.strokeRect(O - 4, pz(-GOAL_W), 4, GOAL_W * 2 * S);
  g.strokeRect(O + 105 * S, pz(-GOAL_W), 4, GOAL_W * 2 * S);

  // Círculo da câmara de TV (tracejado, para não se confundir com os jogadores de Portugal)
  g.setLineDash([4, 3]);
  g.strokeStyle = MAP_COLORS.zone; g.lineWidth = 2;
  g.beginPath(); g.arc(px(zoneState.x), pz(zoneState.z), BROADCAST.radius * S, 0, Math.PI * 2); g.stroke();
  g.setLineDash([]);

  // Cone de visão por baixo de tudo, para não tingir as outras marcas
  const a = Math.atan2(Math.cos(invader.heading), Math.sin(invader.heading));
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.beginPath(); g.moveTo(px(invader.x), pz(invader.z));
  g.arc(px(invader.x), pz(invader.z), 22, a - 0.5, a + 0.5); g.closePath(); g.fill();

  // Jogadores e árbitro: contexto, discretos
  for (const n of npcs) if (n !== ronaldo) circle(n, 2, MAP_COLORS.player);
  circle(ball, 1.8, MAP_COLORS.ball, '#000000', 1);

  // Seguranças e polícia
  for (const s of stewards) {
    if (!s.active) continue;
    const down = s.mode === 'down' || s.mode === 'getup';   // caído no chão
    if (down) diamond(s, 3, MAP_COLORS.down, 'rgba(0,0,0,.4)');
    else diamond(s, 4, MAP_COLORS.danger, '#ffffff');
  }

  // Ronaldo por cima dos outros jogadores
  star(ronaldo, 5.5, ronaldo.cool === 0 ? MAP_COLORS.ronaldo : MAP_COLORS.ronaldoDone, ronaldo.cool === 0 ? '#000000' : 'rgba(0,0,0,.3)');

  // Tu: círculo grande com contorno branco
  circle(invader, 4.2, MAP_COLORS.you, '#ffffff', 2);
}
