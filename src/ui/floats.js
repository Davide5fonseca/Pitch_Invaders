// Textos que sobem no ecrã por cima de um ponto do campo ("+100 SELFIE!", "GOLOOOO!").
import * as THREE from 'three';
import { camera } from '../systems/renderer.js';

const floats = [], proj = new THREE.Vector3();
const LIFE = 1.4;

export function float(text, x, z, color, huge = false) {
  const el = document.createElement('div');
  el.className = 'float' + (huge ? ' huge' : '');
  el.textContent = text;
  el.style.color = color;
  document.body.appendChild(el);
  floats.push({ el, x, z, t: 0, y0: huge ? 4.4 : 2.8 });      // os grandes ficam por cima dos pequenos
}

export function updateFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    if (f.t > LIFE) { f.el.remove(); floats.splice(i, 1); continue; }
    proj.set(f.x, f.y0 + f.t * 1.5, f.z).project(camera);
    f.el.style.transform = `translate(${(proj.x + 1) / 2 * innerWidth}px, ${(1 - proj.y) / 2 * innerHeight}px) translate(-50%, -50%)`;
    f.el.style.opacity = 1 - f.t / LIFE;
  }
}
