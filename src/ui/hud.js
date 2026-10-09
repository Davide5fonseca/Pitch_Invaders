// Painel de cima (pontos, fôlego, finta), avisos rápidos e flash da selfie.
import { game, score } from '../state.js';
import { PLAYER } from '../config.js';
import { $ } from '../utils.js';
import { activeStewards } from '../entities/stewards.js';

export function showHud(visible) {
  $('hud').classList.toggle('hidden', !visible);
  $('map').classList.toggle('hidden', !visible);
}

export function updateHud() {
  $('sScore').textContent = score();
  $('sTime').textContent = game.time.toFixed(1);
  $('sSelfies').textContent = game.selfies;
  $('sGoals').textContent = game.goals;
  $('sStewards').textContent = activeStewards().length;
  const st = $('sStamina');
  st.style.width = game.stamina + '%';
  st.style.background = game.stamina > 30 ? '#4ade80' : '#f87171';
  const p = 1 - game.dashCd / PLAYER.dashCooldown;
  $('dash').style.background = game.dashCd > 0 ? `conic-gradient(var(--pink) ${p * 360}deg, #444 0)` : 'var(--pink)';
  $('dashBtn').style.setProperty('--cd', (p * 360).toFixed(0) + 'deg');
}

let toastT;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

export function flash() {
  const f = $('flash');
  f.style.transition = 'none'; f.style.opacity = '.8';
  void f.offsetWidth;
  f.style.transition = 'opacity .45s'; f.style.opacity = '0';
}
