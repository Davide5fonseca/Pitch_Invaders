// Texturas desenhadas em código (sem ficheiros de imagem).
import * as THREE from 'three';
import { renderer } from '../systems/renderer.js';
import { HL, HW } from '../config.js';
import { rand } from '../utils.js';

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function texture(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

export function pitchTexture() {
  const S = 16, M = 4;
  const [c, g] = canvas((105 + 2 * M) * S, (68 + 2 * M) * S);
  const X = x => (x + HL + M) * S, Y = z => (z + HW + M) * S;
  g.fillStyle = '#2d7a31'; g.fillRect(0, 0, c.width, c.height);
  const n = 14;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? '#358c39' : '#2d7a31';
    g.fillRect(X(-HL + i * 105 / n), 0, 105 / n * S, c.height);
  }
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.fillStyle = '#fff'; g.lineWidth = 0.12 * S;
  const circle = (x, z, r) => { g.beginPath(); g.arc(X(x), Y(z), r * S, 0, Math.PI * 2); g.stroke(); };
  const dot = (x, z) => { g.beginPath(); g.arc(X(x), Y(z), 0.2 * S, 0, Math.PI * 2); g.fill(); };
  g.strokeRect(X(-HL), Y(-HW), 105 * S, 68 * S);
  g.beginPath(); g.moveTo(X(0), Y(-HW)); g.lineTo(X(0), Y(HW)); g.stroke();
  circle(0, 0, 9.15); dot(0, 0);
  for (const s of [-1, 1]) {
    const gx = s * HL;
    g.strokeRect(Math.min(X(gx), X(gx - s * 16.5)), Y(-20.16), 16.5 * S, 40.32 * S);
    g.strokeRect(Math.min(X(gx), X(gx - s * 5.5)), Y(-9.16), 5.5 * S, 18.32 * S);
    dot(gx - s * 11, 0);
    g.save();
    g.beginPath();
    g.rect(s < 0 ? X(gx + 16.5) : 0, 0, s < 0 ? c.width : X(gx - 16.5), c.height);
    g.clip();
    circle(gx - s * 11, 0, 9.15);
    g.restore();
    for (const z of [-HW, HW]) { g.beginPath(); g.arc(X(gx), Y(z), 1 * S, 0, Math.PI * 2); g.stroke(); }
  }
  return texture(c);
}

export function crowdCanvas() {
  const [c, g] = canvas(512, 256);
  g.fillStyle = '#151820'; g.fillRect(0, 0, 512, 256);
  const shirts = ['#d0202a', '#d0202a', '#f4f4f4', '#1e3a8a', '#ffb703', '#2a9d8f', '#e76f51', '#8ecae6', '#222'];
  const skins = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
  for (let row = 0, y = 8; y < 256; y += 12, row++) {
    for (let x = 4 + (row % 2) * 5; x < 512; x += 10) {
      if (Math.random() < 0.08) continue;
      const jx = x + rand(-1.5, 1.5);
      g.fillStyle = shirts[Math.floor(Math.random() * shirts.length)];
      g.fillRect(jx - 3.5, y, 7, 7);
      g.fillStyle = skins[Math.floor(Math.random() * skins.length)];
      g.beginPath(); g.arc(jx, y - 1.5, 2.7, 0, Math.PI * 2); g.fill();
    }
  }
  return c;
}

export function adCanvas() {
  const [c, g] = canvas(1024, 64);
  const ads = [['#0b3d91', 'PITCH INVADERS'], ['#d0202a', 'GOLO TV'], ['#111', 'SUPER BOLA'], ['#f4a300', 'RELVADO+']];
  ads.forEach(([bg, txt], i) => {
    g.fillStyle = bg; g.fillRect(i * 256, 0, 256, 64);
    g.fillStyle = '#fff'; g.font = '900 34px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, i * 256 + 128, 34, 236);         // encolhe textos compridos para caberem
  });
  return c;
}

export function ballTexture() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#151515';
  for (const [x, y] of [[0, 64], [64, 20], [64, 108], [128, 64], [192, 20], [192, 108], [256, 64]]) {
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 - Math.PI / 2;
      g.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16);
    }
    g.fill();
  }
  return texture(c);
}

export function netTexture() {
  const [c, g] = canvas(32, 32);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
  g.strokeRect(1, 1, 30, 30);
  return texture(c, [1, 1]);
}

export function labelTexture(text, color) {
  const [c, g] = canvas(256, 96);
  g.font = '900 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(text, 128, 50);
  g.fillStyle = color; g.fillText(text, 128, 50);
  return texture(c);
}
