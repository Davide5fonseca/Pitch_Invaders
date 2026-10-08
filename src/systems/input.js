// Teclado, rato (com pointer lock nas câmaras de 1ª pessoa) e toque.
import * as THREE from 'three';
import { renderer, camera } from './renderer.js';
import { game, view, relControls } from '../state.js';
import { MOUSE_SENSITIVITY } from '../config.js';
import { $, clamp } from '../utils.js';

export const keys = {};
export const pointer = { active: false, cx: 0, cy: 0, sx: 0, sy: 0, lastTap: 0 };
export const input = { lastPointerType: 'mouse' };

const canvas = renderer.domElement;
export const locked = () => document.pointerLockElement === canvas;

export function lockMouse() {
  if (!relControls() || input.lastPointerType === 'touch' || locked()) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
export function unlockMouse() {
  if (locked()) document.exitPointerLock();
}

// Ponto do relvado por baixo do dedo / rato
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
export function pointerGround() {
  ndc.set(pointer.cx / innerWidth * 2 - 1, -(pointer.cy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(groundPlane, hit);
}

// handlers: { start(), dash(), cycleCamera() }
export function initInput(handlers) {
  const canStart = () => game.state === 'menu' || game.state === 'over';

  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'Space' || e.code === 'Enter') {
      if (canStart()) handlers.start();
      else if (game.state === 'play' && e.code === 'Space') handlers.dash();
    }
    if (e.code === 'KeyC' && !e.repeat && game.state !== 'loading') handlers.cycleCamera();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  addEventListener('pointerdown', e => { input.lastPointerType = e.pointerType; }, true);
  canvas.addEventListener('pointerdown', e => {
    if (game.state !== 'play') return;
    // Rato nas câmaras Ombro / GoPro / Cabeça: prende o cursor; clique = finta
    if (relControls() && e.pointerType === 'mouse') {
      if (locked()) handlers.dash(); else lockMouse();
      return;
    }
    const now = performance.now();
    if (now - pointer.lastTap < 280) handlers.dash();     // toque duplo = finta
    pointer.lastTap = now;
    Object.assign(pointer, { active: true, cx: e.clientX, cy: e.clientY, sx: e.clientX, sy: e.clientY });
  });
  addEventListener('pointermove', e => { if (pointer.active) { pointer.cx = e.clientX; pointer.cy = e.clientY; } });
  addEventListener('pointerup', () => { pointer.active = false; });
  addEventListener('pointercancel', () => { pointer.active = false; });

  addEventListener('mousemove', e => {
    if (!locked() || game.state !== 'play') return;
    view.yaw -= e.movementX * MOUSE_SENSITIVITY;
    view.pitch = clamp(view.pitch - e.movementY * MOUSE_SENSITIVITY, -0.9, 0.7);
  });

  $('overlay').addEventListener('click', () => { if (canStart()) handlers.start(); });
  $('camBtn').addEventListener('click', e => { e.stopPropagation(); handlers.cycleCamera(); e.currentTarget.blur(); });
}
