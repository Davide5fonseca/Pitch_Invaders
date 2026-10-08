// Seguranças e polícia: entram pelos placards e perseguem o invasor.
import { world, game } from '../state.js';
import { COLORS, STEWARDS } from '../config.js';
import { rand, dist } from '../utils.js';
import { makeEntity } from './character.js';

// Criados todos de início e reutilizados (evita criar/destruir bonecos a meio do jogo)
export function buildStewards() {
  for (let i = 0; i < STEWARDS.poolSize; i++) {
    const s = makeEntity(COLORS.steward, 0, 0);
    s.active = false; s.ch.root.visible = false;
    world.stewards.push(s);
  }
}

export const activeStewards = () => world.stewards.filter(s => s.active);

export function clearStewards() {
  for (const s of world.stewards) { s.active = false; s.ch.root.visible = false; }
}

export function spawnSteward() {
  const s = world.stewards.find(s => !s.active);
  if (!s) return;
  const { invader } = world;
  let pos;
  for (let i = 0; i < 12; i++) {
    const side = Math.floor(Math.random() * 4);
    pos = side < 2 ? { x: rand(-50, 50), z: side ? 39 : -39 } : { x: side === 2 ? 57.5 : -57.5, z: rand(-32, 32) };
    if (dist(pos, invader) > STEWARDS.spawnMinDist) break;
  }
  game.spawnCount++;
  const P = STEWARDS.police, N = STEWARDS.steward;
  const police = game.time > P.after && game.spawnCount % P.every === 0;
  s.ch.setColor(police ? COLORS.police : COLORS.steward);
  Object.assign(s, pos, {
    vx: 0, vz: 0, active: true, police,
    base: police ? P.base : rand(...N.base), cap: police ? P.cap : N.cap,
    lead: police ? P.lead : rand(...N.lead), wob: rand(0, 10),
    heading: Math.atan2(invader.x - pos.x, invader.z - pos.z),
  });
  s.ch.root.visible = true;
}

// Devolve true se algum segurança apanhou o invasor
export function updateStewards(dt, invulnerable) {
  const { invader, npcs, stewards } = world;
  for (const s of stewards) {
    if (!s.active) continue;
    const spd = Math.min(s.base + game.time * STEWARDS.speedGrowth, s.cap);
    // Apontam para onde o invasor VAI estar (antecipação)
    const dx = invader.x + invader.vx * s.lead - s.x, dz = invader.z + invader.vz * s.lead - s.z;
    const d = Math.hypot(dx, dz) || 1;
    s.wob += dt * 2.5;
    let mx = dx / d + Math.cos(s.wob) * .12, mz = dz / d + Math.sin(s.wob) * .12;
    // Afastam-se uns dos outros e contornam os jogadores
    for (const o of stewards) {
      if (o === s || !o.active) continue;
      const ox = s.x - o.x, oz = s.z - o.z, od = Math.hypot(ox, oz);
      if (od > 0 && od < 1.8) { mx += ox / od * .7; mz += oz / od * .7; }
    }
    for (const n of npcs) {
      const ox = s.x - n.x, oz = s.z - n.z, od = Math.hypot(ox, oz);
      if (od > 0 && od < 1.2) { mx += ox / od * .9; mz += oz / od * .9; }
    }
    const ml = Math.hypot(mx, mz) || 1;
    s.vx = mx / ml * spd; s.vz = mz / ml * spd;
    s.x += s.vx * dt; s.z += s.vz * dt;
    if (!invulnerable && dist(s, invader) < STEWARDS.catchDist) return true;
  }
  return false;
}

export function stopStewards() {
  for (const s of world.stewards) s.vx = s.vz = 0;
}
