// Ecrã inicial, ecrã de "Apanhado!" e tabela de recordes online.
import { game, world, camMode } from '../state.js';
import { SCORE } from '../config.js';
import { $, storageGet, storageSet } from '../utils.js';
import { fetchScores, submitScore } from '../systems/leaderboard.js';

const overlay = () => $('overlay');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function table(scores, highlight) {
  if (!scores) return '<p class="keys">Tabela online indisponível</p>';
  if (!scores.length) return '<p class="keys">Ainda não há recordes. Sê o primeiro!</p>';
  return `<table class="lb-table">${scores.map((s, i) => `
    <tr class="${i + 1 === highlight ? 'me' : ''}"><td>${i + 1}</td><td>${esc(s.name)}</td><td>${s.score}</td></tr>`).join('')}
  </table>`;
}

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
      <span>📺</span><span>No círculo vermelho apareces no ecrã gigante</span><em>+${SCORE.tvPerSecond}/s</em>
      <span>🤸</span><span>Desvia-te de um segurança que se atira</span><em>+${SCORE.dodge}</em>
      <span>⏱</span><span>Cada segundo em campo</span><em>+${SCORE.perSecond}</em>
    </div>
    <p class="keys">WASD / setas: mover · Shift: sprint · Espaço: finta (ninguém te apanha)</p>
    <p class="keys"><b>C</b>: mudar de câmara — TV · Ombro · GoPro no peito · Cabeça (agora: ${camMode().name})</p>
    <p class="keys">Telemóvel: arrasta o dedo para mover · toque duplo para a finta</p>
    ${world.xbot ? '' : '<p class="keys">(Modelo 3D indisponível — a usar bonecos simplificados)</p>'}
    <div class="cta">Prime ESPAÇO ou clica para começar</div>
    <div class="lb" id="lbMenu"><h3>🏆 Melhores de sempre</h3><p class="keys">A carregar…</p></div>
  </div>`;
  overlay().classList.remove('hidden');
  fetchScores().then(d => {
    const el = $('lbMenu');
    if (el && game.state === 'menu') el.innerHTML = '<h3>🏆 Melhores de sempre</h3>' + table(d?.scores?.slice(0, 5) ?? null);
  });
}

export function showGameOver(points, record) {
  const extra = [`${game.selfies} selfies`, `${game.goals} golos`, `${game.dodges} dribles`, `${Math.floor(game.tvPoints)} pts de TV`];
  overlay().innerHTML = `<div class="card">
    <h1 class="red">APANHADO! 🚨</h1>
    <p class="big">${points} pontos</p>
    <p>${game.time.toFixed(1)}s em campo · ${extra.join(' · ')}</p>
    <p style="color:var(--gold);font-weight:700">${record ? '🏆 Novo recorde pessoal!' : 'O teu recorde: ' + game.best}</p>
    <div class="lb no-start">
      ${points > 0 ? `<form id="lbForm">
        <input id="lbName" maxlength="16" placeholder="O teu nome" autocomplete="nickname" value="${esc(storageGet('invasao3d-name', ''))}">
        <button type="submit">Guardar na tabela</button>
      </form><p id="lbMsg" class="keys"></p>` : ''}
      <div id="lbTable"><p class="keys">A carregar recordes…</p></div>
    </div>
    <div class="cta" id="again" style="visibility:hidden">ESPAÇO ou clica fora da tabela para jogar outra vez</div>
  </div>`;
  overlay().classList.remove('hidden');
  setTimeout(() => { const a = $('again'); if (a) a.style.visibility = 'visible'; }, 700);

  const entry = { score: points, time: game.time, selfies: game.selfies, goals: game.goals, dodges: game.dodges };
  fetchScores().then(d => { const t = $('lbTable'); if (t) t.innerHTML = table(d?.scores?.slice(0, 10) ?? null); });

  const form = $('lbForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('lbName').value.trim();
    if (!name) { $('lbMsg').textContent = 'Escreve o teu nome primeiro.'; return; }
    storageSet('invasao3d-name', name);
    form.querySelector('button').disabled = true;
    $('lbMsg').textContent = 'A guardar…';
    const res = await submitScore({ ...entry, name });
    if (!$('lbMsg')) return;                       // já começou outro jogo
    if (!res) { $('lbMsg').textContent = 'Sem ligação à tabela online.'; form.querySelector('button').disabled = false; return; }
    if (res.error) { $('lbMsg').textContent = res.error; form.querySelector('button').disabled = false; return; }
    form.remove();
    $('lbMsg').textContent = res.rank ? `Ficaste em ${res.rank}º lugar! 🎉` : 'Guardado! Ainda não chega ao top 100.';
    $('lbTable').innerHTML = table(res.scores.slice(0, 10), res.rank);
  });
}
