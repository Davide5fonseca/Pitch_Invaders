// Câmaras: TV, Ombro, GoPro no peito e Cabeça.
import * as THREE from 'three';
import { camera, sun } from './renderer.js';
import { game, view, world, camMode, firstPerson, relControls } from '../state.js';
import { CAM_MODES } from '../config.js';
import { $, rand, forward, right, storageSet } from '../utils.js';
import { input, unlockMouse } from './input.js';
import { toast } from '../ui/hud.js';
import { showMenu } from '../ui/menus.js';

const camPos = new THREE.Vector3(0, 40, 80), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();

export function updateCamButton() {
  $('camBtn').textContent = '📷 ' + camMode().name;
}

export function setCamMode(i) {
  view.camMode = (i + CAM_MODES.length) % CAM_MODES.length;
  storageSet('invasao3d-cam', view.camMode);
  updateCamButton();
  if (world.invader) view.yaw = world.invader.heading;
  view.pitch = 0;
  if (!relControls()) unlockMouse();
  if (game.state === 'loading') return;
  if (game.state === 'menu') showMenu();
  const touch = input.lastPointerType === 'touch';
  toast(`📷 ${camMode().name} — ` + (!relControls()
    ? (touch ? 'toca onde queres ir' : 'WASD / setas movem no ecrã')
    : touch ? 'arrasta o dedo: cima = correr, lados = rodar'
            : 'clica para olhar com o rato · W/S frente/trás · A/D lado · Q/E rodar · clique = finta'));
}

export function updateCamera(dt) {
  const inv = world.invader, id = camMode().id;
  let fov = camMode().fov;
  const f = forward(view.yaw), r = right(view.yaw);

  if (game.state === 'loading' || game.state === 'menu') {
    // Volta lenta ao estádio
    const a = performance.now() * 0.00006;
    camPos.set(Math.sin(a) * 80, 40, Math.cos(a) * 80);
    camLook.set(0, 0, 0);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    fov = 50;
  } else if (id === 'tv') {
    const k = 1 - Math.exp(-dt * 4);
    camPos.lerp(tmp.set(inv.x * 0.92, 15, inv.z + 18), k);
    camLook.lerp(tmp.set(inv.x + inv.vx * 0.25, 1, inv.z - 3 + inv.vz * 0.25), k * 1.5);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  } else if (id === 'ombro') {
    const k = 1 - Math.exp(-dt * 8);
    camPos.lerp(tmp.set(inv.x - f.x * 4.2 + r.x * 0.7, 2.3, inv.z - f.z * 4.2 + r.z * 0.7), k);
    camLook.set(inv.x + f.x * 8, 1.2 + view.pitch * 6, inv.z + f.z * 8);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  } else {
    // Primeira pessoa: GoPro no peito ou câmara na cabeça, com balanço da passada
    const chest = id === 'peito';
    const sp = Math.hypot(inv.vx, inv.vz), amp = Math.min(1, sp / 7);
    view.bobPh += dt * sp * 1.4;
    const ph = view.bobPh;
    let y = (chest ? 1.3 : 1.68) + Math.abs(Math.sin(ph)) * (chest ? 0.09 : 0.05) * amp;
    const lat = Math.sin(ph) * (chest ? 0.05 : 0.025) * amp, fwd = chest ? 0.28 : 0.12;
    let roll = Math.sin(ph) * (chest ? 0.04 : 0.015) * amp;
    let p = view.pitch + (chest ? -0.15 : -0.08) + Math.cos(ph * 2) * (chest ? 0.015 : 0.006) * amp;
    if (chest && sp > 8) { p += rand(-0.008, 0.008); roll += rand(-0.01, 0.01); }
    if (game.state === 'over') {                 // apanhado: a câmara cai ao chão
      const t = Math.min(1, (performance.now() - game.overAt) / 600);
      y += (0.35 - y) * t; roll += t * 0.9; p += (0.35 - p) * t;
    }
    camPos.set(inv.x + f.x * fwd + r.x * lat, y, inv.z + f.z * fwd + r.z * lat);
    camLook.set(inv.x + f.x * 10, 0, inv.z + f.z * 10);
    camera.position.copy(camPos);
    camera.rotation.set(p, view.yaw + Math.PI, roll, 'YXZ');
  }

  if (game.state === 'play' && game.dashT > 0) fov += 12;
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 10);
    camera.updateProjectionMatrix();
  }
  if (game.shake > 0) {
    camera.position.add(tmp.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(game.shake * (firstPerson() ? 0.15 : 0.8)));
  }
  // As sombras acompanham a zona onde a câmara está a olhar
  sun.position.set(camLook.x + 25, 45, camLook.z + 20);
  sun.target.position.copy(camLook);
}
