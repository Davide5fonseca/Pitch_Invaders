// Som: público de estádio gravado (CC0, ver README) + efeitos gerados em código.
// Camadas: ambiente em ciclo (sempre), euforia em ciclo (em direto no ecrã gigante) e sons únicos
// (golo, festejo, "uuuh", assobiadela). Se os ficheiros falharem, usa ruído gerado em código.
import { game, world } from '../state.js';
import { dist, storageGet, storageSet } from '../utils.js';

const BASE = import.meta.env.BASE_URL + 'audio/';
const FILES = {
  bed: 'crowd-loop.mp3',     // St. Pauli (Millerntor) + bombos de uma claque chilena
  live: 'crowd-live.mp3',    // público em euforia
  goal: 'goal.mp3', cheer: 'cheer.mp3', ooh: 'ooh.mp3', boo: 'boo.mp3',
};

// Os ficheiros começam a descarregar logo; só se descodificam quando houver AudioContext
const raw = {};
for (const [k, f] of Object.entries(FILES)) {
  raw[k] = fetch(BASE + f).then(r => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
}
const buffers = {};

let ac, master, bedGain, liveGain, loopsStarted = false;
let muted = storageGet('pi-muted', '0') === '1';

export function audio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ac.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ac.destination);
    decodeAll();
  }
  if (ac.state === 'suspended' && !document.hidden) ac.resume();
  return ac;
}

async function decodeAll() {
  await Promise.all(Object.entries(raw).map(async ([k, p]) => {
    const ab = await p;
    if (!ab) return;
    try { buffers[k] = await ac.decodeAudioData(ab.slice(0)); } catch (e) { console.warn('Som não descodificado:', k, e); }
  }));
  startLoops();
}

// Toca um ciclo sem fim (salta uns ms nas pontas para não se ouvir o "clique" do MP3)
function loop(buf, dest) {
  const s = ac.createBufferSource();
  s.buffer = buf; s.loop = true;
  s.loopStart = 0.03; s.loopEnd = buf.duration - 0.03;
  s.connect(dest);
  s.start(0, Math.random() * (buf.duration - 1));
}

function startLoops() {
  if (loopsStarted) return;
  loopsStarted = true;
  bedGain = ac.createGain(); bedGain.gain.value = 0; bedGain.connect(master);
  liveGain = ac.createGain(); liveGain.gain.value = 0; liveGain.connect(master);
  if (buffers.bed) loop(buffers.bed, bedGain);
  else synthBed(bedGain);
  if (buffers.live) loop(buffers.live, liveGain);
}

// Pausa o som quando o separador fica escondido
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) ac.suspend(); else ac.resume();
});

// Para testes: estado do som
export const audioState = () => ({ ctx: ac?.state, decoded: Object.keys(buffers), loops: loopsStarted, bed: bedGain?.gain.value, live: liveGain?.gain.value, muted });

// ───────── Volume geral / silêncio ─────────
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  storageSet('pi-muted', m ? '1' : '0');
  if (master) master.gain.setTargetAtTime(m ? 0 : 1, ac.currentTime, 0.05);
}

// ───────── O público reage ao jogo (chamado a cada frame) ─────────
export function updateCrowdAudio() {
  if (!ac || !bedGain) return;
  let bed = 0.28, live = 0;                       // menu: estádio ao longe
  if (game.state === 'play') {
    bed = 0.55;
    // Mais barulho quando um segurança está quase a apanhar-te
    let near = Infinity;
    for (const s of world.stewards) if (s.active) near = Math.min(near, dist(s, world.invader));
    if (near < 7) bed += (1 - near / 7) * 0.35;
    if (game.live) live = 0.8;
  } else if (game.state === 'over') {
    bed = 0.4;
  }
  bedGain.gain.setTargetAtTime(bed, ac.currentTime, 0.35);
  liveGain.gain.setTargetAtTime(live, ac.currentTime, 0.3);
}

// ───────── Sons únicos ─────────
function play(name, volume, fallback) {
  const a = audio(); if (!a) return;
  const buf = buffers[name];
  if (!buf) { fallback?.(); return; }
  const s = a.createBufferSource(), g = a.createGain();
  s.buffer = buf;
  s.playbackRate.value = 0.96 + Math.random() * 0.08;   // pequena variação para não soar repetido
  g.gain.value = volume;
  s.connect(g).connect(master);
  s.start();
}

export const crowdGoal = () => play('goal', 1, () => roar(2.5));
export const crowdCheer = (volume = 0.7) => play('cheer', volume, () => roar(1.6));
export const crowdOoh = () => play('ooh', 0.9, synthOoh);
export const crowdBoo = () => play('boo', 0.65);

export function beep(f, d, type = 'square', v = 0.06) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(v, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
  o.connect(g).connect(master);
  o.start(); o.stop(a.currentTime + d);
}

// Apito do árbitro
export function whistle() {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain();
  o.frequency.value = 2900; lfo.frequency.value = 28; lg.gain.value = 180;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0.07, a.currentTime);
  g.gain.setValueAtTime(0.07, a.currentTime + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8);
  o.connect(g).connect(master);
  o.start(); lfo.start(); o.stop(a.currentTime + 0.8); lfo.stop(a.currentTime + 0.8);
}

// ───────── Reserva: ruído gerado em código ─────────
function noise(len) {
  const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter();
  s.buffer = buf; f.type = 'lowpass';
  s.connect(f);
  return [s, f];
}
function synthBed(dest) {
  const [s, f] = noise(3), g = ac.createGain();
  g.gain.value = 0.07; f.frequency.value = 600; s.loop = true;
  f.connect(g).connect(dest);
  s.start();
}
function roar(len) {
  const [s, f] = noise(len), g = ac.createGain();
  f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + len);
  f.connect(g).connect(master);
  s.start();
}
function synthOoh() {
  const [s, f] = noise(1.2), g = ac.createGain();
  f.frequency.setValueAtTime(400, ac.currentTime);
  f.frequency.linearRampToValueAtTime(900, ac.currentTime + 0.5);
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
  f.connect(g).connect(master);
  s.start();
}
