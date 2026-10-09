// Contador de partidas anónimo: visita, partida iniciada e partida terminada.
// Cada browser recebe um identificador aleatório (sem nome, email ou dados pessoais).
import { storageGet, storageSet, isTouch } from '../utils.js';

const URL = '/api/stats';

function deviceId() {
  let id = storageGet('pi-device', '');
  if (!id) {
    id = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    storageSet('pi-device', id);
  }
  return id;
}

export function track(type, data = {}) {
  if (import.meta.env.DEV) return;                // não conta os testes locais
  const body = JSON.stringify({ type, device: deviceId(), mobile: isTouch(), ...data });
  try {
    // sendBeacon chega mesmo que a página feche logo a seguir
    if (navigator.sendBeacon?.(URL, new Blob([body], { type: 'application/json' }))) return;
    fetch(URL, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
  } catch (e) {}
}
