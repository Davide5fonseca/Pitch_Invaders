export const $ = id => document.getElementById(id);
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const lerpAngle = (a, b, t) => a + ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * t;
export const pad2 = n => String(n).padStart(2, '0');

// Direção "para a frente" e "para a direita" a partir de um ângulo (heading/yaw)
export const forward = yaw => ({ x: Math.sin(yaw), z: Math.cos(yaw) });
export const right = yaw => ({ x: -Math.cos(yaw), z: Math.sin(yaw) });

export function storageGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
}
export function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
