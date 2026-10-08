// O invasor (tu): movimento, sprint, fôlego e finta.
import { world, game, view, relControls } from '../state.js';
import { COLORS, PLAYER } from '../config.js';
import { clamp, dist, forward, right } from '../utils.js';
import { makeEntity, ring } from './character.js';
import { KITS } from './kits.js';
import { keys, pointer, pointerGround } from '../systems/input.js';

export function buildInvader() {
  const inv = makeEntity(KITS.invader, 0, 36);
  inv.ch.root.add(ring(COLORS.invader, 0.55, 0.8));
  inv.ch.root.visible = false;
  world.invader = inv;
}

export function resetInvader() {
  Object.assign(world.invader, { x: 0, z: 36, vx: 0, vz: 0, heading: Math.PI });
  view.yaw = Math.PI; view.pitch = 0;
}

// Lê o input e devolve a direção desejada { ix, iz } e se o toque pede sprint
function readInput(dt) {
  const inv = world.invader;
  let ix = 0, iz = 0, far = false;
  if (relControls()) {
    // Controlos relativos para onde estás a olhar (câmaras Ombro / GoPro / Cabeça)
    let fwd = 0, side = 0, turn = 0;
    if (keys.KeyW || keys.ArrowUp) fwd++;
    if (keys.KeyS || keys.ArrowDown) fwd--;
    if (keys.KeyD) side++;
    if (keys.KeyA) side--;
    if (keys.KeyE || keys.ArrowRight) turn++;
    if (keys.KeyQ || keys.ArrowLeft) turn--;
    if (pointer.active) {                       // joystick virtual no telemóvel
      const jx = pointer.cx - pointer.sx, jy = pointer.cy - pointer.sy;
      turn += clamp(jx / 70, -1, 1);
      fwd += clamp(-jy / 50, -1, 1);
      far = -jy > 110;
    }
    view.yaw -= turn * 2.6 * dt;
    const f = forward(view.yaw), r = right(view.yaw);
    ix = f.x * fwd + r.x * side;
    iz = f.z * fwd + r.z * side;
  } else {
    // Câmara TV: direções do ecrã
    if (keys.ArrowLeft || keys.KeyA) ix--;
    if (keys.ArrowRight || keys.KeyD) ix++;
    if (keys.ArrowUp || keys.KeyW) iz--;
    if (keys.ArrowDown || keys.KeyS) iz++;
    if (pointer.active) {
      const g = pointerGround();
      if (g) {
        const dx = g.x - inv.x, dz = g.z - inv.z, d = Math.hypot(dx, dz);
        if (d > 0.6) { ix = dx / d; iz = dz / d; far = d > 8; }
      }
    }
  }
  const il = Math.hypot(ix, iz);
  if (il > 1) { ix /= il; iz /= il; }
  return { ix, iz, il, far };
}

export function updateInvader(dt) {
  const inv = world.invader;
  const { ix, iz, il, far } = readInput(dt);

  const sprinting = (keys.ShiftLeft || keys.ShiftRight || far) && il > 0.2 && game.stamina > 0;
  game.stamina = sprinting
    ? Math.max(0, game.stamina - PLAYER.staminaDrain * dt)
    : Math.min(100, game.stamina + PLAYER.staminaRegen * dt);

  const speed = sprinting ? PLAYER.sprint : PLAYER.run;
  if (game.dashT > 0) {
    game.dashT -= dt;
    inv.vx = game.dashDir.x * PLAYER.dash; inv.vz = game.dashDir.z * PLAYER.dash;
  } else {
    const k = 1 - Math.exp(-dt * 10);
    inv.vx += (ix * speed - inv.vx) * k;
    inv.vz += (iz * speed - inv.vz) * k;
  }
  inv.x = clamp(inv.x + inv.vx * dt, -55, 55);
  inv.z = clamp(inv.z + inv.vz * dt, -37, 37);

  // Não atravessa os jogadores
  for (const n of world.npcs) {
    const d = dist(inv, n);
    if (d > 0 && d < 0.75) {
      inv.x = n.x + (inv.x - n.x) / d * 0.75;
      inv.z = n.z + (inv.z - n.z) / d * 0.75;
    }
  }
}

// Finta: arranque curto em que ninguém te apanha
export function startDash() {
  if (game.dashCd > 0) return false;
  const inv = world.invader;
  const sp = Math.hypot(inv.vx, inv.vz);
  if (sp > 0.5) game.dashDir = { x: inv.vx / sp, z: inv.vz / sp };
  else if (relControls()) game.dashDir = forward(view.yaw);
  game.dashT = PLAYER.dashTime;
  game.dashCd = PLAYER.dashCooldown;
  return true;
}
