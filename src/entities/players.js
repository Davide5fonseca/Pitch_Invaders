// Portugal e Brasil (4-4-2), o Ronaldo (o craque que o invasor quer apanhar) e o árbitro.
import { world } from '../state.js';
import { HL, HW } from '../config.js';
import { rand, clamp } from '../utils.js';
import { makeEntity, ring, label } from './character.js';
import { KITS } from './kits.js';

// Guarda-redes, 4 defesas, 4 médios, 2 avançados (o último é o craque)
const FORMATION = [[-49, 0], [-36, -20], [-38, -7], [-38, 7], [-36, 20], [-20, -22], [-22, -7], [-22, 7], [-20, 22], [-7, -9], [-7, 9]];
const NUMBERS = [1, 2, 4, 5, 3, 8, 6, 10, 11, 9, 7];
const STAR_INDEX = 10;                 // o Ronaldo: avançado de Portugal, nº 7
const RONALDO_LOOK = { skin: '#d9a07a', hair: '#15100c', height: 1.04 };

export function buildPlayers() {
  const teams = [[1, KITS.portugal, KITS.portugalGk], [-1, KITS.brazil, KITS.brazilGk]];
  for (const [side, kit, gkKit] of teams) {
    FORMATION.forEach(([x, z], i) => {
      const ronaldo = side === 1 && i === STAR_INDEX;
      const e = makeEntity(i === 0 ? gkKit : kit, x * side, z * side, ronaldo
        ? { print: '7', printName: 'RONALDO', look: RONALDO_LOOK }
        : { print: String(NUMBERS[i]) });
      Object.assign(e, { homeX: e.x, homeZ: e.z, tx: e.x, tz: e.z, wait: rand(0, 3), spd: 1.3, heading: side * Math.PI / 2 });
      world.npcs.push(e);
    });
  }

  const star = world.npcs[STAR_INDEX];
  star.cool = 0;
  world.star = star;
  world.starRing = ring('#ffd166', 0.7, 0.95);
  star.ch.root.add(world.starRing, label('★ RONALDO', '#ffd166'));

  const ref = makeEntity(KITS.ref, 0, 12, { print: '' });
  Object.assign(ref, { isRef: true, homeX: 0, homeZ: 12, tx: 0, tz: 12, wait: 1, spd: 1.3 });
  world.npcs.push(ref);
}

// Passeiam perto da sua posição; o árbitro acompanha a bola
export function updatePlayers(dt) {
  const { ball } = world;
  for (const n of world.npcs) {
    if (n.isRef) { n.homeX = clamp(ball.x - 8, -45, 45); n.homeZ = clamp(ball.z + 10, -30, 30); }
    const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
    if (d < 0.3) {
      n.vx = n.vz = 0;
      n.wait -= dt;
      if (n.wait <= 0) {
        n.tx = clamp(n.homeX + rand(-5, 5), -HL + 1, HL - 1);
        n.tz = clamp(n.homeZ + rand(-5, 5), -HW + 1, HW - 1);
        n.wait = rand(1.5, 5);
        n.spd = n.isRef ? 2.2 : 1.3;
      }
    } else {
      n.vx = dx / d * n.spd; n.vz = dz / d * n.spd;
      n.x += n.vx * dt; n.z += n.vz * dt;
    }
  }
}

// O craque foge para longe depois da selfie
export function starRunAway(from) {
  let far = null;
  for (let i = 0; i < 10; i++) {
    const c = { x: rand(-45, 45), z: rand(-28, 28) };
    if (!far || Math.hypot(c.x - from.x, c.z - from.z) > Math.hypot(far.x - from.x, far.z - from.z)) far = c;
  }
  Object.assign(world.star, { tx: far.x, tz: far.z, spd: 6.5, wait: 3 });
}
