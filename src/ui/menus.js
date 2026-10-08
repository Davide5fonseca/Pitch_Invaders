// Ecrã inicial e ecrã de "Apanhado!".
import { game, world, camMode } from '../state.js';
import { SCORE } from '../config.js';
import { $ } from '../utils.js';

const overlay = () => $('overlay');

export function hideOverlay() {
  overlay().classList.add('hidden');
}

export function showMenu() {
  overlay().innerHTML = `<div class="card">
    <h1>INVASÃO DE CAMPO</h1>
    <p>Salta para o relvado e foge aos seguranças o máximo de tempo possível!</p>
    <div class="rules">
      <span>📸</span><span>Selfie com o craque nº 10 (anel dourado)</span><em>+${SCORE.selfie}</em>
      <span>⚽</span><span>Marca golo com a bola</span><em>+${SCORE.goal}</em>
      <span>⏱</span><span>Cada segundo em campo</span><em>+${SCORE.perSecond}</em>
    </div>
    <p class="keys">WASD / setas: mover · Shift: sprint · Espaço: finta (ninguém te apanha)</p>
    <p class="keys"><b>C</b>: mudar de câmara — TV · Ombro · GoPro no peito · Cabeça (agora: ${camMode().name})</p>
    <p class="keys">Telemóvel: arrasta o dedo para mover · toque duplo para a finta</p>
    ${world.xbot ? '' : '<p class="keys">(Modelo 3D indisponível — a usar bonecos simplificados)</p>'}
    <div class="cta">Prime ESPAÇO ou clica para começar</div>
    ${game.best ? `<p class="keys">Recorde: ${game.best}</p>` : ''}
  </div>`;
  overlay().classList.remove('hidden');
}

export function showGameOver(points, record) {
  overlay().innerHTML = `<div class="card">
    <h1 class="red">APANHADO! 🚨</h1>
    <p class="big">${points} pontos</p>
    <p>${game.time.toFixed(1)}s em campo · ${game.selfies} selfies · ${game.goals} golos</p>
    <p style="color:var(--gold);font-weight:700">${record ? '🏆 Novo recorde!' : 'Recorde: ' + game.best}</p>
    <div class="cta" id="again" style="visibility:hidden">ESPAÇO ou clica para tentar outra vez</div>
  </div>`;
  overlay().classList.remove('hidden');
  setTimeout(() => { const a = $('again'); if (a) a.style.visibility = 'visible'; }, 700);
}
