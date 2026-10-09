// Tabela de recordes online (Netlify Blobs).
//   GET  /api/scores  → { day, week, all }: top 10 de hoje, desta semana e de sempre
//   POST /api/scores  → guarda uma pontuação e devolve as tabelas + a tua posição em cada uma
// Cada jogador (nome, sem distinguir maiúsculas nem acentos) aparece uma só vez: com o seu melhor resultado.
// "Hoje" e "esta semana" (a começar à segunda-feira) seguem a hora de Portugal.
import { getStore } from '@netlify/blobs';
import { lisbonDay, periodStarts } from '../shared/lisbon.mjs';

const KEY = 'board-v2';
const LEGACY_KEY = 'top';
const SHOW = 10;
const MAX_PLAYERS = 1000;      // recordes de sempre guardados
const RECENT_DAYS = 8;         // pontuações recentes guardadas (chegam para "esta semana")
const MAX_RECENT = 5000;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export function cleanName(name) {
  return String(name ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _.\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
}

// "Ângela" e "angela" contam como o mesmo jogador
export const playerKey = name => cleanName(name).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const int = (v, max) => Number.isFinite(+v) && +v >= 0 && +v <= max ? Math.floor(+v) : null;

// Valida a pontuação. Não é à prova de batota, mas trava valores impossíveis.
export function validate(body, now = new Date()) {
  const name = cleanName(body?.name);
  const score = int(body?.score, 1e7), selfies = int(body?.selfies, 1e4), goals = int(body?.goals, 1e4), dodges = int(body?.dodges, 1e4);
  const time = Number.isFinite(+body?.time) && +body.time >= 0 && +body.time <= 7200 ? Math.round(+body.time * 10) / 10 : null;
  if (!name) return { error: 'Nome inválido' };
  if ([score, selfies, goals, dodges, time].includes(null)) return { error: 'Dados inválidos' };
  const max = Math.ceil(time) * 60 + selfies * 100 + goals * 300 + dodges * 50 + 100;
  if (score > max) return { error: 'Pontuação impossível' };
  return { entry: { name, score, time, selfies, goals, dodges, at: now.toISOString() } };
}

export { periodStarts };

const better = (a, b) => b.score - a.score || a.time - b.time;
const pub = ({ name, score, time, selfies, goals, dodges }) => ({ name, score, time, selfies, goals, dodges });

// Melhor resultado de cada jogador numa lista, ordenado
function bestPerPlayer(entries) {
  const best = new Map();
  for (const e of entries) {
    const k = playerKey(e.name), cur = best.get(k);
    if (!cur || better(e, cur) < 0) best.set(k, e);
  }
  return [...best.values()].sort(better);
}

export function tables(board, now = new Date()) {
  const { day, week } = periodStarts(now);
  const recent = board.recent.map(e => ({ ...e, d: lisbonDay(new Date(e.at)) }));
  return {
    day: bestPerPlayer(recent.filter(e => e.d >= day)),
    week: bestPerPlayer(recent.filter(e => e.d >= week)),
    all: Object.values(board.best).sort(better),
  };
}

const top = list => list.slice(0, SHOW).map(pub);
const rankOf = (list, key) => { const i = list.findIndex(e => playerKey(e.name) === key); return i === -1 ? null : i + 1; };

export function addEntry(board, entry, now = new Date()) {
  const key = playerKey(entry.name);
  const prev = board.best[key];
  const improved = !prev || better(entry, prev) < 0;
  if (improved) board.best[key] = entry;
  // Limita o número de jogadores guardados (fica com os melhores)
  const keys = Object.keys(board.best);
  if (keys.length > MAX_PLAYERS) {
    keys.sort((a, b) => better(board.best[a], board.best[b])).slice(MAX_PLAYERS).forEach(k => delete board.best[k]);
  }
  const cutoff = now.getTime() - RECENT_DAYS * 864e5;
  board.recent = [...board.recent.filter(e => Date.parse(e.at) >= cutoff), entry].slice(-MAX_RECENT);
  return { key, improved };
}

// Converte a tabela antiga (uma lista com repetidos) para o formato novo
export function migrate(legacy) {
  const board = { best: {}, recent: [] };
  for (const e of legacy || []) {
    const entry = { ...pub(e), at: e.at || `${e.date || '2026-10-08'}T12:00:00.000Z` };
    const k = playerKey(entry.name);
    if (!board.best[k] || better(entry, board.best[k]) < 0) board.best[k] = entry;
    board.recent.push(entry);
  }
  return board;
}

async function load(store) {
  const res = await store.getWithMetadata(KEY, { type: 'json' });
  if (res && res.data) return { board: res.data, etag: res.etag };
  const legacy = await store.get(LEGACY_KEY, { type: 'json' });
  return { board: migrate(legacy), etag: null };
}

function response(board, now, extra = {}) {
  const t = tables(board, now);
  return { day: top(t.day), week: top(t.week), all: top(t.all), scores: top(t.all), ...extra };
}

export async function handle(req, store, now = new Date()) {
  if (req.method === 'GET') {
    const { board } = await load(store);
    return json(response(board, now));
  }
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const { entry, error } = validate(body, now);
    if (error) return json({ error }, 400);
    // Gravação condicional: se outra pessoa gravou entretanto, volta a ler e tenta de novo
    for (let attempt = 0; attempt < 5; attempt++) {
      const { board, etag } = await load(store);
      const { key, improved } = addEntry(board, entry, now);
      const res = await store.setJSON(KEY, board, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
      if (res && res.modified === false) continue;
      const t = tables(board, now);
      const ranks = { day: rankOf(t.day, key), week: rankOf(t.week, key), all: rankOf(t.all, key) };
      return json(response(board, now, { ranks, improved, rank: ranks.all }));
    }
    return json({ error: 'Tabela ocupada, tenta outra vez' }, 503);
  }
  return json({ error: 'Método não suportado' }, 405);
}

export default async req => handle(req, getStore({ name: 'leaderboard', consistency: 'strong' }));

export const config = { path: '/api/scores' };
