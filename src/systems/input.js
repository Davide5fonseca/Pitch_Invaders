// Teclado, rato (com pointer lock nas câmaras de 1ª pessoa) e toque (joystick + finta + arrastar para olhar).
import * as THREE from 'three';
import { renderer, camera } from './renderer.js';
import { game, view, relControls } from '../state.js';
import { MOUSE_SENSITIVITY } from '../config.js';
import { $, clamp } from '../utils.js';

export const keys = {};
export const pointer = { active: false, cx: 0, cy: 0 };          // rato a carregar (câmara TV: ir para ali)
export const stick = { active: false, x: 0, y: 0 };              // joystick virtual, -1..1
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

// Ponto do relvado por baixo do rato
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
export function pointerGround() {
  ndc.set(pointer.cx / innerWidth * 2 - 1, -(pointer.cy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(groundPlane, hit);
}

function setTouchMode(on) {
  document.body.classList.toggle('touch', on);
}

// ───────── Joystick virtual ─────────
const STICK_R = 52;
const touches = new Map();          // pointerId → { kind: 'stick' | 'look', ox, oy, x, y }
let stickId = null;

function stickEl() { return $('stick'); }
function placeStick(x, y) {
  // O joystick aparece onde o polegar tocou
  const el = stickEl(), r = el.offsetWidth / 2;
  el.style.left = (x - r) + 'px'; el.style.top = (y - r) + 'px'; el.style.bottom = 'auto';
  el.classList.add('on');
}
function resetStick() {
  const el = stickEl();
  el.style.left = el.style.top = el.style.bottom = '';
  el.classList.remove('on');
  $('knob').style.transform = '';
  Object.assign(stick, { active: false, x: 0, y: 0 });
  stickId = null;
}
function moveStick(t) {
  let dx = t.x - t.ox, dy = t.y - t.oy;
  const d = Math.hypot(dx, dy);
  if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
  $('knob').style.transform = `translate(${dx}px, ${dy}px)`;
  Object.assign(stick, { active: true, x: dx / STICK_R, y: dy / STICK_R });
}

function onTouchDown(e, handlers) {
  if (game.state !== 'play') return;
  const t = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  if (e.clientX < innerWidth * 0.5 && stickId === null) {
    t.kind = 'stick'; stickId = e.pointerId;
    placeStick(e.clientX, e.clientY);
    moveStick(t);
  } else {
    t.kind = 'look';
  }
  touches.set(e.pointerId, t);
}

// handlers: { start(), dash(), cycleCamera(), toggleSound() }
export function initInput(handlers) {
  if (matchMedia('(pointer: coarse)').matches) setTouchMode(true);
  const canStart = () => game.state === 'menu' || game.state === 'over';
  const typing = e => e.target instanceof Element && e.target.closest('input, textarea, button');

  addEventListener('keydown', e => {
    if (typing(e)) return;                     // a escrever o nome ou com um botão focado
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'Space' || e.code === 'Enter') {
      if (canStart()) handlers.start();
      else if (game.state === 'play' && e.code === 'Space') handlers.dash();
    }
    if (e.code === 'KeyC' && !e.repeat && game.state !== 'loading') handlers.cycleCamera();
    if (e.code === 'KeyM' && !e.repeat) handlers.toggleSound();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  addEventListener('pointerdown', e => {
    input.lastPointerType = e.pointerType;
    if (e.pointerType === 'touch') setTouchMode(true);
    else if (e.pointerType === 'mouse') setTouchMode(false);
  }, true);

  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') { onTouchDown(e, handlers); return; }
    if (game.state !== 'play') return;
    // Rato nas câmaras Ombro / GoPro / Cabeça: prende o cursor; clique = finta
    if (relControls()) {
      if (locked()) handlers.dash(); else lockMouse();
      return;
    }
    Object.assign(pointer, { active: true, cx: e.clientX, cy: e.clientY });
  });

  addEventListener('pointermove', e => {
    const t = touches.get(e.pointerId);
    if (t) {
      const px = t.x, py = t.y;
      t.x = e.clientX; t.y = e.clientY;
      if (t.kind === 'stick') moveStick(t);
      else if (relControls() && game.state === 'play') {   // arrastar com a mão direita = olhar à volta
        view.yaw -= (t.x - px) * 0.007;
        view.pitch = clamp(view.pitch - (t.y - py) * 0.005, -0.9, 0.7);
      }
      return;
    }
    if (pointer.active) { pointer.cx = e.clientX; pointer.cy = e.clientY; }
  });
  const up = e => {
    if (touches.has(e.pointerId)) {
      if (e.pointerId === stickId) resetStick();
      touches.delete(e.pointerId);
      return;
    }
    pointer.active = false;
  };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);

  addEventListener('mousemove', e => {
    if (!locked() || game.state !== 'play') return;
    view.yaw -= e.movementX * MOUSE_SENSITIVITY;
    view.pitch = clamp(view.pitch - e.movementY * MOUSE_SENSITIVITY, -0.9, 0.7);
  });

  $('dashBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); handlers.dash(); });
  $('camBtn').addEventListener('click', e => { e.stopPropagation(); handlers.cycleCamera(); e.currentTarget.blur(); });
  $('soundBtn').addEventListener('click', e => { e.stopPropagation(); handlers.toggleSound(); e.currentTarget.blur(); });
}

// Larga tudo (fim de jogo, menu)
export function releaseAll() {
  touches.clear();
  resetStick();
  pointer.active = false;
}
