// Ecrã inicial, ecrã de "Apanhado!" e tabela de recordes online.
import { game, world, view } from '../state.js';
import { SCORE, CAM_MODES } from '../config.js';
import { $, storageGet, storageSet, isTouch } from '../utils.js';
import { fetchScores, submitScore } from '../systems/leaderboard.js';
import { isMuted } from '../systems/audio.js';

const SITE = 'https://improvee.pt';
const CAM_ICONS = { tv: '📺', ombro: '🎥', peito: '📷', cabeca: '👀' };
const MEDALS = ['🥇', '🥈', '🥉'];

const overlay = () => $('overlay');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const myName = () => storageGet('invasao3d-name', '');

// Ações dos botões (definidas em main.js para evitar dependências circulares)
let handlers = { start() {}, setCamera() {}, toggleSound() {} };
export function setMenuHandlers(h) { handlers = h; }

overlay().addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (!act) return;
  if (act.dataset.act === 'play') handlers.start();
  else if (act.dataset.act === 'cam') handlers.setCamera(+act.dataset.cam);
  else if (act.dataset.act === 'share') share(act);
  else if (act.dataset.act === 'sound') { handlers.toggleSound(); act.blur(); }
  else if (act.dataset.act === 'period') { boards[act.dataset.board].period = act.dataset.period; renderBoard(act.dataset.board); }
});

// ───────── Tabela de classificação: Hoje / Semana / Sempre ─────────
const PERIODS = [['day', 'Hoje'], ['week', 'Semana'], ['all', 'Sempre']];
const EMPTY = {
  day: 'Ainda ninguém jogou hoje. Sê o primeiro!',
  week: 'Ainda não há resultados esta semana.',
  all: 'Ainda não há recordes. Sê o primeiro!',
};
// Mesmo critério do servidor: "Ângela" e "angela" são o mesmo jogador
const keyOf = n => String(n || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
const boards = {};      // id do elemento → { data, period, me }

// Aceita a resposta nova ({ day, week, all }) e a antiga ({ scores })
const normalize = d => (d && (d.all || d.scores)) ? { day: d.day || [], week: d.week || [], all: d.all || d.scores } : null;

// Abre no separador mais animado: hoje se já houver jogo, senão a semana, senão sempre
function pickPeriod(data) {
  if (!data) return 'all';
  if (data.day.length >= 3) return 'day';
  if (data.week.length >= 3) return 'week';
  return 'all';
}

function renderBoard(id) {
  const el = $(id), st = boards[id];
  if (!el || !st) return;
  const tabs = `<div class="tabs" role="tablist">${PERIODS.map(([p, label]) =>
    `<button role="tab" data-act="period" data-board="${id}" data-period="${p}" aria-selected="${p === st.period}">${label}</button>`).join('')}</div>`;
  let body;
  if (st.data === undefined) body = '<div class="skeleton"></div>'.repeat(5);
  else if (st.data === null) body = '<p class="empty">Tabela online indisponível de momento.</p>';
  else {
    const list = st.data[st.period] || [];
    body = !list.length ? `<p class="empty">${EMPTY[st.period]}</p>` : `<ol>${list.slice(0, 10).map((e, i) => `
      <li class="${st.me && keyOf(e.name) === st.me ? 'me' : ''}"><span class="r ${i < 3 ? 'medal' : ''}">${MEDALS[i] || i + 1}</span>
        <span class="n">${esc(e.name)}</span><span class="s">${e.score}</span></li>`).join('')}</ol>`;
  }
  const pb = game.best ? `<div class="pb"><span>O teu recorde</span><b>${game.best}</b></div>` : '';
  el.innerHTML = `<h3>🏆 Classificação</h3>${tabs}${body}${pb}`;
}

function setBoard(id, data, opts = {}) {
  boards[id] = { data, me: keyOf(myName()), ...opts };
  renderBoard(id);
}

function cameraChips() {
  return CAM_MODES.map((m, i) =>
    `<button class="chip" data-act="cam" data-cam="${i}" aria-pressed="${i === view.camMode}">${CAM_ICONS[m.id] || '📷'} ${m.name}</button>`).join('');
}

// Ícone de som em todos os botões (painel e menus)
export function updateSoundButtons() {
  const icon = isMuted() ? '🔇' : '🔊';
  document.querySelectorAll('#soundBtn, [data-act=sound]').forEach(b => { b.textContent = icon; b.title = isMuted() ? 'Ligar o som (M)' : 'Desligar o som (M)'; });
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
      <p class="tagline">Salta para o relvado no Portugal–Brasil e corre até ao Ronaldo para a selfie da tua vida, antes que os seguranças te apanhem.</p>
      <div class="actions">
        <button class="btn-play" data-act="play">▶ Jogar</button>
        <button class="btn-icon" data-act="sound" aria-label="Som"></button>
        <span class="hint desktop-only">ou prime <kbd>Espaço</kbd></span>
      </div>
      <div class="section-title">Câmara</div>
      <div class="chips">${cameraChips()}</div>
      <div class="section-title">Como ganhar pontos</div>
      <div class="score-grid">
        <div class="sc"><i>📸</i><div><b>+${SCORE.selfie}</b><span>Selfie com o Ronaldo</span></div></div>
        <div class="sc"><i>⚽</i><div><b>+${SCORE.goal}</b><span>Golo</span></div></div>
        <div class="sc"><i>📺</i><div><b>+${SCORE.tvPerSecond}/s</b><span>No círculo da TV</span></div></div>
        <div class="sc"><i>🤸</i><div><b>+${SCORE.dodge}</b><span>Drible a um mergulho</span></div></div>
        <div class="sc"><i>⏱</i><div><b>+${SCORE.perSecond}/s</b><span>Em campo</span></div></div>
      </div>
      ${controlsHelp()}
      ${world.xbot ? '' : '<p class="controls">(Modelo 3D indisponível — a usar bonecos simplificados)</p>'}
    </section>
    <aside class="menu-side"><div class="board" id="lbMenu"></div></aside>
  </div>`;
  o.classList.remove('hidden');
  updateSoundButtons();
  setBoard('lbMenu', undefined, { period: 'all' });
  fetchScores().then(d => {
    if (game.state !== 'menu') return;
    const data = normalize(d);
    setBoard('lbMenu', data, { period: pickPeriod(data) });
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
        <button class="btn-icon" data-act="sound" aria-label="Som"></button>
      </div>
      <p class="hint desktop-only">ou prime <kbd>Espaço</kbd> para jogar outra vez</p>
    </section>
    <aside class="menu-side"><div class="board" id="lbTable"></div></aside>
  </div>`;
  o.classList.remove('hidden');
  updateSoundButtons();
  countUp($('finalScore'), points);

  setBoard('lbTable', undefined, { period: 'day' });
  let saved = false;
  fetchScores().then(d => {
    if (saved || !$('lbTable')) return;
    const data = normalize(d);
    setBoard('lbTable', data, { period: pickPeriod(data) });
  });

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
    saved = true;
    // Mostra a posição em cada tabela e abre aquela onde ficaste mais bem classificado
    const r = res.ranks || { all: res.rank };
    const parts = PERIODS.filter(([p]) => r[p]).map(([p, label]) => `${label}: ${r[p]}º`);
    const bestP = ['all', 'week', 'day'].filter(p => r[p]).sort((x, y) => r[x] - r[y])[0];
    const podium = Object.values(r).some(x => x && x <= 3);
    $('lbMsg').textContent = parts.length
      ? parts.join(' · ') + (podium ? ' 🎉' : '') + (res.improved === false ? ' · o teu melhor de sempre continua acima' : '')
      : 'Guardado!';
    setBoard('lbTable', normalize(res), { me: keyOf(name), period: bestP || 'day' });
  });
}
