// Tabela de recordes online: GET /api/scores (top 20), POST /api/scores (guardar pontuação).
// Os dados ficam no Netlify Blobs (armazenamento incluído no Netlify, sem base de dados à parte).
import { getStore } from '@netlify/blobs';

const KEY = 'top';
const KEEP = 100;      // quantas pontuações guardamos
const SHOW = 20;       // quantas devolvemos

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

const int = (v, max) => Number.isFinite(+v) && +v >= 0 && +v <= max ? Math.floor(+v) : null;

// Valida a pontuação. Não é à prova de batota, mas trava valores impossíveis.
export function validate(body) {
  const name = cleanName(body?.name);
  const score = int(body?.score, 1e7), selfies = int(body?.selfies, 1e4), goals = int(body?.goals, 1e4), dodges = int(body?.dodges, 1e4);
  const time = Number.isFinite(+body?.time) && +body.time >= 0 && +body.time <= 7200 ? Math.round(+body.time * 10) / 10 : null;
  if (!name) return { error: 'Nome inválido' };
  if ([score, selfies, goals, dodges, time].includes(null)) return { error: 'Dados inválidos' };
  const max = Math.ceil(time) * 60 + selfies * 100 + goals * 300 + dodges * 50 + 100;
  if (score > max) return { error: 'Pontuação impossível' };
  return { entry: { name, score, time, selfies, goals, dodges, date: new Date().toISOString().slice(0, 10) } };
}

export function insert(list, entry) {
  const next = [...list, entry].sort((a, b) => b.score - a.score || a.time - b.time).slice(0, KEEP);
  const i = next.indexOf(entry);
  return { list: next, rank: i === -1 ? null : i + 1 };
}

export async function handle(req, store) {
  if (req.method === 'GET') {
    const list = (await store.get(KEY, { type: 'json' })) ?? [];
    return json({ scores: list.slice(0, SHOW) });
  }
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const { entry, error } = validate(body);
    if (error) return json({ error }, 400);
    const current = (await store.get(KEY, { type: 'json' })) ?? [];
    const { list, rank } = insert(current, entry);
    await store.setJSON(KEY, list);
    return json({ rank, scores: list.slice(0, SHOW) });
  }
  return json({ error: 'Método não suportado' }, 405);
}

export default async req => handle(req, getStore({ name: 'leaderboard', consistency: 'strong' }));

export const config = { path: '/api/scores' };
