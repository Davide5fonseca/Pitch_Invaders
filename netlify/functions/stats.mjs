// Contador de partidas (anónimo), guardado no Netlify Blobs.
//   POST /api/stats  { type: 'visit' | 'start' | 'end', device, mobile, camera?, time?, score? }
//   GET  /api/stats?days=30  (cabeçalho x-stats-key = variável STATS_KEY) → resumo por dia + totais
// O "device" é um identificador aleatório guardado no browser; aqui só se guarda um hash dele.
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { lisbonDay, addDays } from '../shared/lisbon.mjs';

const TYPES = new Set(['visit', 'start', 'end']);
const CAMERAS = new Set(['tv', 'ombro', 'peito', 'cabeca']);
const MAX_EVENTS_PER_DEVICE_DAY = 300;      // trava abusos: acima disto, o dispositivo deixa de contar nesse dia

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export const hashDevice = id => createHash('sha256').update(String(id)).digest('hex').slice(0, 16);

export const emptyDay = () => ({
  visits: 0, starts: 0, ends: 0, playTime: 0, scoreSum: 0, best: 0,
  mobile: 0, desktop: 0, cams: {}, devices: {}, players: {},
});
export const emptyAll = () => ({ firstDay: null, visits: 0, starts: 0, ends: 0, playTime: 0, devices: {}, players: {} });

export function validate(body) {
  const type = body?.type;
  const device = typeof body?.device === 'string' ? body.device : '';
  if (!TYPES.has(type)) return { error: 'Tipo inválido' };
  if (device.length < 8 || device.length > 64) return { error: 'Dispositivo inválido' };
  const ev = { type, mobile: !!body.mobile };
  if (CAMERAS.has(body.camera)) ev.camera = body.camera;
  if (type === 'end') {
    const time = +body.time, score = +body.score;
    if (!Number.isFinite(time) || time < 0 || time > 7200) return { error: 'Tempo inválido' };
    if (!Number.isFinite(score) || score < 0 || score > 1e7) return { error: 'Pontos inválidos' };
    ev.time = Math.round(time * 10) / 10;
    ev.score = Math.floor(score);
  }
  return { ev, h: hashDevice(device) };
}

// Soma o evento ao dia. Devolve false se o dispositivo já passou o limite.
export function addToDay(day, ev, h) {
  const n = day.devices[h] || 0;
  if (n >= MAX_EVENTS_PER_DEVICE_DAY) return false;
  if (n === 0) ev.mobile ? day.mobile++ : day.desktop++;     // tipo de dispositivo, uma vez por dia
  day.devices[h] = n + 1;
  if (ev.type === 'visit') day.visits++;
  if (ev.type === 'start') {
    day.starts++;
    day.players[h] = 1;
    if (ev.camera) day.cams[ev.camera] = (day.cams[ev.camera] || 0) + 1;
  }
  if (ev.type === 'end') {
    day.ends++;
    day.playTime += ev.time;
    day.scoreSum += ev.score;
    day.best = Math.max(day.best, ev.score);
  }
  return true;
}

export function addToAll(all, ev, h, today) {
  all.firstDay ||= today;
  all.devices[h] = 1;
  if (ev.type === 'visit') all.visits++;
  if (ev.type === 'start') { all.starts++; all.players[h] = 1; }
  if (ev.type === 'end') { all.ends++; all.playTime += ev.time; }
}

// Lê, altera e grava com gravação condicional (se outro pedido gravou entretanto, repete)
async function update(store, key, empty, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await store.getWithMetadata(key, { type: 'json' });
    const data = res?.data ?? empty();
    if (change(data) === false) return false;
    const w = await store.setJSON(key, data, res?.etag ? { onlyIfMatch: res.etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return true;
  }
  return false;
}

export function summarizeDay(date, d) {
  const day = d || emptyDay();
  return {
    date,
    visitors: Object.keys(day.devices).length,
    players: Object.keys(day.players).length,
    visits: day.visits, starts: day.starts, ends: day.ends,
    playTime: Math.round(day.playTime),
    avgTime: day.ends ? Math.round(day.playTime / day.ends * 10) / 10 : 0,
    avgScore: day.ends ? Math.round(day.scoreSum / day.ends) : 0,
    best: day.best, mobile: day.mobile, desktop: day.desktop, cams: day.cams,
  };
}

// Totais do período: pessoas únicas contam uma só vez, mesmo que tenham jogado em vários dias
export function summarizeRange(raws, days) {
  const unique = k => new Set(raws.flatMap(v => (v ? Object.keys(v[k]) : []))).size;
  const sum = k => days.reduce((t, d) => t + d[k], 0);
  const cams = {};
  for (const d of days) for (const [c, n] of Object.entries(d.cams)) cams[c] = (cams[c] || 0) + n;
  const ends = sum('ends'), playTime = sum('playTime');
  return {
    visitors: unique('devices'), players: unique('players'),
    visits: sum('visits'), starts: sum('starts'), ends, playTime,
    avgTime: ends ? Math.round(playTime / ends * 10) / 10 : 0,
    best: Math.max(0, ...days.map(d => d.best)),
    mobile: sum('mobile'), desktop: sum('desktop'), cams,
  };
}

function authorized(req) {
  const expected = (globalThis.Netlify?.env?.get?.('STATS_KEY') ?? process.env.STATS_KEY) || '';
  if (!expected) return 'missing';
  const given = req.headers.get('x-stats-key') || new URL(req.url).searchParams.get('key') || '';
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? 'ok' : 'denied';
}

export async function handle(req, store, boardStore, now = new Date()) {
  const today = lisbonDay(now);

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const { ev, h, error } = validate(body);
    if (error) return json({ error }, 400);
    const counted = await update(store, `day:${today}`, emptyDay, day => addToDay(day, ev, h));
    if (counted) await update(store, 'all', emptyAll, all => addToAll(all, ev, h, today));
    return json({ ok: true, counted });
  }

  if (req.method === 'GET') {
    const auth = authorized(req);
    if (auth === 'missing') return json({ error: 'Falta configurar a variável STATS_KEY no Netlify' }, 503);
    if (auth === 'denied') return json({ error: 'Chave errada' }, 401);
    const n = Math.min(90, Math.max(1, parseInt(new URL(req.url).searchParams.get('days'), 10) || 30));
    const dates = Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
    const [raws, all, board] = await Promise.all([
      Promise.all(dates.map(d => store.get(`day:${d}`, { type: 'json' }))),
      store.get('all', { type: 'json' }),
      boardStore.get('board-v2', { type: 'json' }).catch(() => null),
    ]);
    const days = raws.map((v, i) => summarizeDay(dates[i], v));
    const a = all || emptyAll();
    return json({
      today,
      days,
      range: summarizeRange(raws, days),
      totals: {
        firstDay: a.firstDay,
        visitors: Object.keys(a.devices).length,
        players: Object.keys(a.players).length,
        visits: a.visits, starts: a.starts, ends: a.ends,
        playTime: Math.round(a.playTime),
        avgTime: a.ends ? Math.round(a.playTime / a.ends * 10) / 10 : 0,
        namedPlayers: board?.best ? Object.keys(board.best).length : null,
      },
    });
  }

  return json({ error: 'Método não suportado' }, 405);
}

export default async req => handle(
  req,
  getStore({ name: 'stats', consistency: 'strong' }),
  getStore({ name: 'leaderboard', consistency: 'strong' }),
);

export const config = { path: '/api/stats' };
