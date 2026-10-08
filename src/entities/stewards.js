// Seguranças e polícia: entram pelos placards, perseguem o invasor e atiram-se para o agarrar.
import { world, game } from '../state.js';
import { STEWARDS, DIVE } from '../config.js';
import { rand, dist, clamp } from '../utils.js';
import { makeEntity } from './character.js';
import { KITS } from './kits.js';

// Criados todos de início e reutilizados (evita criar/destruir bonecos a meio do jogo)
export function buildStewards() {
  for (let i = 0; i < STEWARDS.poolSize; i++) {
    const s = makeEntity(KITS.steward, 0, 0);
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
  const kit = police ? KITS.police : KITS.steward;
  s.ch.setKit(kit);
  s.ch.setPrint(kit.back, kit.print);
  Object.assign(s, pos, {
    vx: 0, vz: 0, active: true, police,
    base: police ? P.base : rand(...N.base), cap: police ? P.cap : N.cap,
    lead: police ? P.lead : rand(...N.lead), wob: rand(0, 10),
    heading: Math.atan2(invader.x - pos.x, invader.z - pos.z),
    mode: 'chase', t: 0, tilt: 0, lift: 0, animSpeed: undefined,
    diveCd: rand(1.5, 3),
  });
  s.ch.root.visible = true;
}

function startDive(s, inv) {
  const tx = inv.x + inv.vx * 0.25, tz = inv.z + inv.vz * 0.25;
  const d = Math.hypot(tx - s.x, tz - s.z) || 1;
  Object.assign(s, { mode: 'dive', t: DIVE.time, dirX: (tx - s.x) / d, dirZ: (tz - s.z) / d, animSpeed: 0 });
  s.heading = Math.atan2(s.dirX, s.dirZ);
}

// Persegue o invasor, contornando colegas e jogadores
function chase(s, dt, inv) {
  const spd = Math.min(s.base + game.time * STEWARDS.speedGrowth, s.cap);
  const dx = inv.x + inv.vx * s.lead - s.x, dz = inv.z + inv.vz * s.lead - s.z;
  const d = Math.hypot(dx, dz) || 1;
  s.wob += dt * 2.5;
  let mx = dx / d + Math.cos(s.wob) * .12, mz = dz / d + Math.sin(s.wob) * .12;
  for (const o of world.stewards) {
    if (o === s || !o.active) continue;
    const ox = s.x - o.x, oz = s.z - o.z, od = Math.hypot(ox, oz);
    if (od > 0 && od < 1.8) { mx += ox / od * .7; mz += oz / od * .7; }
  }
  for (const n of world.npcs) {
    const ox = s.x - n.x, oz = s.z - n.z, od = Math.hypot(ox, oz);
    if (od > 0 && od < 1.2) { mx += ox / od * .9; mz += oz / od * .9; }
  }
  const ml = Math.hypot(mx, mz) || 1;
  s.vx = mx / ml * spd; s.vz = mz / ml * spd;
  s.x += s.vx * dt; s.z += s.vz * dt;
}

// Devolve { caught, dodged }: se alguém te apanhou e quantos mergulhos falharam neste frame
export function updateStewards(dt, invulnerable) {
  const inv = world.invader;
  let caught = false, dodged = 0;
  for (const s of world.stewards) {
    if (!s.active) continue;

    if (s.mode === 'chase') {
      chase(s, dt, inv);
      s.diveCd -= dt;
      const d = dist(s, inv);
      if (s.diveCd <= 0 && d < DIVE.range && d > DIVE.minRange && Math.random() < dt * DIVE.chancePerSec) startDive(s, inv);
      if (!invulnerable && d < STEWARDS.catchDist) caught = true;

    } else if (s.mode === 'dive') {
      // Voa na horizontal e vai caindo para a frente
      s.t -= dt;
      const sp = DIVE.speed * (0.5 + 0.5 * s.t / DIVE.time);
      s.vx = s.dirX * sp; s.vz = s.dirZ * sp;
      s.x += s.vx * dt; s.z += s.vz * dt;
      s.tilt = Math.min(1.38, s.tilt + dt * 1.38 / (DIVE.time * 0.6));
      s.lift = Math.sin(clamp(1 - s.t / DIVE.time, 0, 1) * Math.PI) * 0.35 + 0.05;
      // Os braços esticados chegam mais longe que os pés
      const hx = s.x + s.dirX * DIVE.reach, hz = s.z + s.dirZ * DIVE.reach;
      if (!invulnerable && Math.hypot(inv.x - hx, inv.z - hz) < 0.85) caught = true;
      if (s.t <= 0) {
        Object.assign(s, { mode: 'down', t: DIVE.downTime, vx: 0, vz: 0, lift: 0.05 });
        if (!caught) dodged++;
      }

    } else if (s.mode === 'down') {
      s.t -= dt;
      if (s.t <= 0) Object.assign(s, { mode: 'getup', t: DIVE.getUpTime });

    } else if (s.mode === 'getup') {
      s.t -= dt;
      s.tilt = 1.38 * Math.max(0, s.t / DIVE.getUpTime);
      s.lift = 0.05 * Math.max(0, s.t / DIVE.getUpTime);
      if (s.t <= 0) Object.assign(s, { mode: 'chase', tilt: 0, lift: 0, animSpeed: undefined, diveCd: rand(...DIVE.cooldown) });
    }
  }
  return { caught, dodged };
}

export function stopStewards() {
  for (const s of world.stewards) if (s.mode === 'chase' || s.mode === undefined) s.vx = s.vz = 0;
}
