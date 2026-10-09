// Ecrã inicial, ecrã de "Apanhado!" e tabela de recordes online.
import { game, world, view } from '../state.js';
import { SCORE, CAM_MODES } from '../config.js';
import { $, storageGet, storageSet, isTouch } from '../utils.js';
import { fetchScores, submitScore } from '../systems/leaderboard.js';

const SITE = 'https://improvee.pt';
const CAM_ICONS = { tv: '📺', ombro: '🎥', peito: '📷', cabeca: '👀' };
const MEDALS = ['🥇', '🥈', '🥉'];

const overlay = () => $('overlay');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const myName = () => storageGet('invasao3d-name', '');

// Ações dos botões (definidas em main.js para evitar dependências circulares)
let handlers = { start() {}, setCamera() {} };
export function setMenuHandlers(h) { handlers = h; }

overlay().addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (!act) return;
  if (act.dataset.act === 'play') handlers.start();
  else if (act.dataset.act === 'cam') handlers.setCamera(+act.dataset.cam);
  else if (act.dataset.act === 'share') share(act);
});

function board(scores, { highlight, count, title }) {
  let body;
  if (scores === undefined) body = '<div class="skeleton"></div>'.repeat(5);
  else if (!scores) body = '<p class="empty">Tabela online indisponível de momento.</p>';
  else if (!scores.length) body = '<p class="empty">Ainda não há recordes. Sê o primeiro!</p>';
  else {
    const me = myName().toLowerCase();
    body = `<ol>${scores.slice(0, count).map((s, i) => {
      const mine = highlight ? i + 1 === highlight : !!me && s.name.toLowerCase() === me;
      return `<li class="${mine ? 'me' : ''}"><span class="r ${i < 3 ? 'medal' : ''}">${MEDALS[i] || i + 1}</span>
        <span class="n">${esc(s.name)}</span><span class="s">${s.score}</span></li>`;
    }).join('')}</ol>`;
  }
  const pb = game.best ? `<div class="pb"><span>O teu recorde</span><b>${game.best}</b></div>` : '';
  return `<h3>🏆 ${title}</h3>${body}${pb}`;
}

function cameraChips() {
  return CAM_MODES.map((m, i) =>
    `<button class="chip" data-act="cam" data-cam="${i}" aria-pressed="${i === view.camMode}">${CAM_ICONS[m.id] || '📷'} ${m.name}</button>`).join('');
}

export function updateMenuCamera() {
  overlay().querySelectorAll('.chip[data-cam]').forEach(c => c.setAttribute('aria-pressed', String(+c.dataset.cam === view.camMode)));
}

function controlsHelp() {
  return isTouch()
    ? `<div class="controls">🕹️ Joystick à esquerda para correr (até ao fundo = sprint)<br>
       💨 Botão <b>FINTA</b> à direita: ninguém te apanha durante a finta<br>
       👆 Nas câmaras Ombro/GoPro/Cabeça, arrasta à direita para olhar à volta</div>`
    : `<div class="controls"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou setas: correr · <kbd>Shift</kbd> sprint ·
       <kbd>Espaço</kbd> finta · <kbd>C</kbd> câmara<br>Nas câmaras Ombro/GoPro/Cabeça, clica e usa o rato para olhar à volta</div>`;
}

export function hideOverlay() {
  overlay().classList.add('hidden');
}

export function showMenu() {
  const o = overlay();
  o.className = 'menu-bg';
  o.innerHTML = `<div class="menu">
    <section class="menu-main">
      <div class="kicker">⚽ Jogo 3D · grátis no browser</div>
      <h1 class="logo"><span>Pitch</span><span>Invaders</span></h1>
      <p class="tagline">Salta para o relvado, tira selfies com o craque, marca golos e aparece no ecrã gigante, antes que os seguranças te apanhem.</p>
      <div class="actions">
        <button class="btn-play" data-act="play">▶ Jogar</button>
        <span class="hint desktop-only">ou prime <kbd>Espaço</kbd></span>
      </div>
      <div class="section-title">Câmara</div>
      <div class="chips">${cameraChips()}</div>
      <div class="section-title">Como ganhar pontos</div>
      <div class="score-grid">
        <div class="sc"><i>📸</i><div><b>+${SCORE.selfie}</b><span>Selfie com o nº 10</span></div></div>
        <div class="sc"><i>⚽</i><div><b>+${SCORE.goal}</b><span>Golo</span></div></div>
        <div class="sc"><i>📺</i><div><b>+${SCORE.tvPerSecond}/s</b><span>No círculo da TV</span></div></div>
        <div class="sc"><i>🤸</i><div><b>+${SCORE.dodge}</b><span>Drible a um mergulho</span></div></div>
        <div class="sc"><i>⏱</i><div><b>+${SCORE.perSecond}/s</b><span>Em campo</span></div></div>
      </div>
      ${controlsHelp()}
      ${world.xbot ? '' : '<p class="controls">(Modelo 3D indisponível — a usar bonecos simplificados)</p>'}
    </section>
    <aside class="menu-side"><div class="board" id="lbMenu">${board(undefined, { title: 'Melhores de sempre' })}</div></aside>
  </div>`;
  o.classList.remove('hidden');
  fetchScores().then(d => {
    const el = $('lbMenu');
    if (el && game.state === 'menu') el.innerHTML = board(d?.scores ?? null, { count: 10, title: 'Melhores de sempre' });
  });
}

// Pontuação a contar do zero
function countUp(el, to) {
  const t0 = performance.now(), dur = Math.min(1400, 400 + to);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

let lastResult = null;

async function share(btn) {
  const { points } = lastResult || { points: 0 };
  const text = `Fiz ${points} pontos no Pitch Invaders ⚽🏃 Consegues fazer melhor?`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Pitch Invaders', text, url: SITE }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  // Sem partilha nativa (computador): abre o WhatsApp Web
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${SITE}`)}`, '_blank', 'noopener');
  btn.blur();
}

export function showGameOver(points, record) {
  lastResult = { points };
  const o = overlay();
  o.className = 'over-bg';
  o.innerHTML = `<div class="menu">
    <section class="menu-main">
      <div class="kicker red">🚨 Apanhado!</div>
      <div class="final"><b id="finalScore">0</b><span>pontos</span></div>
      ${record ? '<div class="badge gold">🏆 Novo recorde pessoal!</div>' : `<div class="badge dim">O teu recorde: ${game.best}</div>`}
      <div class="stats">
        <span>⏱ ${game.time.toFixed(1)}s</span><span>📸 ${game.selfies}</span><span>⚽ ${game.goals}</span>
        <span>🤸 ${game.dodges}</span><span>📺 ${Math.floor(game.tvPoints)}</span>
      </div>
      ${points > 0 ? `<div class="section-title">Guardar na tabela</div>
      <form id="lbForm">
        <input id="lbName" maxlength="16" placeholder="O teu nome" autocomplete="nickname" enterkeyhint="done" value="${esc(myName())}">
        <button type="submit">Guardar</button>
      </form><p id="lbMsg"></p>` : ''}
      <div class="actions">
        <button class="btn-play" data-act="play">▶ Jogar outra vez</button>
        <button class="btn-sec" data-act="share">📤 Partilhar</button>
      </div>
      <p class="hint desktop-only">ou prime <kbd>Espaço</kbd> para jogar outra vez</p>
    </section>
    <aside class="menu-side"><div class="board" id="lbTable">${board(undefined, { title: 'Top 10' })}</div></aside>
  </div>`;
  o.classList.remove('hidden');
  countUp($('finalScore'), points);

  fetchScores().then(d => { const t = $('lbTable'); if (t && !t.dataset.final) t.innerHTML = board(d?.scores ?? null, { count: 10, title: 'Top 10' }); });

  const form = $('lbForm');
  if (!form) return;
  const entry = { score: points, time: game.time, selfies: game.selfies, goals: game.goals, dodges: game.dodges };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const input = $('lbName'), msg = $('lbMsg');
    const name = input.value.trim();
    if (!name) { msg.textContent = 'Escreve o teu nome primeiro.'; input.focus(); return; }
    storageSet('invasao3d-name', name);
    input.blur();
    form.querySelector('button').disabled = true;
    msg.textContent = 'A guardar…';
    const res = await submitScore({ ...entry, name });
    if (!$('lbMsg')) return;                       // já começou outro jogo
    if (!res || res.error) {
      $('lbMsg').textContent = res?.error || 'Sem ligação à tabela online.';
      form.querySelector('button').disabled = false;
      return;
    }
    form.remove();
    $('lbMsg').textContent = res.rank ? `Ficaste em ${res.rank}º lugar! 🎉` : 'Guardado! Ainda não chega ao top 100.';
    const t = $('lbTable');
    t.dataset.final = '1';
    t.innerHTML = board(res.scores, { count: 10, title: 'Top 10', highlight: res.rank });
  });
}
