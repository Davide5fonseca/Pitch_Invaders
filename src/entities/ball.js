// Bola: chutada ao tocar-lhe, ressalta nos bonecos e nas linhas, e marca golo na baliza.
import * as THREE from 'three';
import { scene } from '../systems/renderer.js';
import { world, game } from '../state.js';
import { HL, HW, GOAL_W, BR } from '../config.js';
import { dist } from '../utils.js';
import { ballTexture } from '../world/textures.js';
import { beep } from '../systems/audio.js';
import { activeStewards } from './stewards.js';

export function buildBall() {
  world.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BR, 24, 16), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: .5 }));
  world.ballMesh.castShadow = true;
  scene.add(world.ballMesh);
  world.ball = { x: 0, z: 0, vx: 0, vz: 0 };
}

export function resetBall() {
  Object.assign(world.ball, { x: 0, z: 0, vx: 0, vz: 0 });
}

// Devolve true quando há golo
export function updateBall(dt) {
  const { ball, invader } = world;
  const R = 0.45 + BR;
  const d = dist(invader, ball);
  if (d < R) {
    const nx = (ball.x - invader.x) / (d || 1), nz = (ball.z - invader.z) / (d || 1);
    const kick = Math.max(6, Math.hypot(invader.vx, invader.vz) * 1.6);
    ball.vx = nx * kick; ball.vz = nz * kick;
    ball.x = invader.x + nx * (R + .01); ball.z = invader.z + nz * (R + .01);
    if (performance.now() - game.lastKick > 150) { beep(170, 0.05, 'sine', 0.12); game.lastKick = performance.now(); }
  }
  for (const p of world.npcs.concat(activeStewards())) {
    const pd = dist(p, ball);
    if (pd > 0 && pd < R) {
      const nx = (ball.x - p.x) / pd, nz = (ball.z - p.z) / pd;
      ball.x = p.x + nx * R; ball.z = p.z + nz * R;
      const dot = ball.vx * nx + ball.vz * nz;
      if (dot < 0) { ball.vx -= 1.6 * dot * nx; ball.vz -= 1.6 * dot * nz; }
    }
  }
  ball.x += ball.vx * dt; ball.z += ball.vz * dt;
  const f = Math.pow(0.5, dt);
  ball.vx *= f; ball.vz *= f;

  const inMouth = Math.abs(ball.z) < GOAL_W - BR;
  if (inMouth && Math.abs(ball.x) > HL + BR * 2) return true;
  if (!inMouth) {
    if (ball.x < -HL + BR) { ball.x = -HL + BR; ball.vx = Math.abs(ball.vx) * .6; }
    if (ball.x > HL - BR) { ball.x = HL - BR; ball.vx = -Math.abs(ball.vx) * .6; }
  }
  if (ball.z < -HW + BR) { ball.z = -HW + BR; ball.vz = Math.abs(ball.vz) * .6; }
  if (ball.z > HW - BR) { ball.z = HW - BR; ball.vz = -Math.abs(ball.vz) * .6; }
  return false;
}

const rollAxis = new THREE.Vector3();
export function placeBall(dt) {
  const { ball, ballMesh } = world;
  const sp = Math.hypot(ball.vx, ball.vz);
  if (sp > 0.01) {
    rollAxis.set(ball.vz / sp, 0, -ball.vx / sp);
    ballMesh.rotateOnWorldAxis(rollAxis, sp * dt / BR);
  }
  ballMesh.position.set(ball.x, BR, ball.z);
}
