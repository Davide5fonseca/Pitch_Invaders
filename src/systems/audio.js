// Sons gerados em código (sem ficheiros de áudio).
let ac, amb;

export function audio() {
  if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}

export function beep(f, d, type = 'square', v = 0.06) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(v, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime + d);
}

function noise(a, len) {
  const buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), f = a.createBiquadFilter();
  s.buffer = buf; f.type = 'lowpass';
  s.connect(f);
  return [s, f];
}

// Rugido do público
export function roar(len = 1.6) {
  const a = audio(); if (!a) return;
  const [s, f] = noise(a, len), g = a.createGain();
  f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + len);
  f.connect(g).connect(a.destination);
  s.start();
}

// Murmúrio contínuo do estádio
export function ambience() {
  const a = audio(); if (!a || amb) return;
  const [s, f] = noise(a, 3);
  amb = a.createGain(); amb.gain.value = 0.035;
  f.frequency.value = 600; s.loop = true;
  f.connect(amb).connect(a.destination);
  s.start();
}

// Público mais barulhento (0 = normal, 1 = em delírio)
export function setExcitement(level) {
  if (!amb || !ac) return;
  amb.gain.setTargetAtTime(0.035 + level * 0.06, ac.currentTime, 0.3);
}

// "Uuuuh!" do público quando um segurança falha o mergulho
export function ooh() {
  const a = audio(); if (!a) return;
  const [s, f] = noise(a, 1.2), g = a.createGain();
  f.frequency.setValueAtTime(400, a.currentTime);
  f.frequency.linearRampToValueAtTime(900, a.currentTime + 0.5);
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.18, a.currentTime + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 1.2);
  f.connect(g).connect(a.destination);
  s.start();
}

export function whistle() {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain();
  o.frequency.value = 2900; lfo.frequency.value = 28; lg.gain.value = 180;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0.07, a.currentTime);
  g.gain.setValueAtTime(0.07, a.currentTime + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8);
  o.connect(g).connect(a.destination);
  o.start(); lfo.start(); o.stop(a.currentTime + 0.8); lfo.stop(a.currentTime + 0.8);
}
