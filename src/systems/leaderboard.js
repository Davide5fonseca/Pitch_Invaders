// Cliente da tabela de recordes online (função do Netlify em /api/scores).
// Em modo local (npm run dev) a função não existe, e devolvemos null.
const URL = '/api/scores';

async function call(options) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(URL, { ...options, signal: ctrl.signal });
    clearTimeout(t);
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error || 'Erro no servidor' };
    return data;
  } catch (e) {
    return null;
  }
}

export const fetchScores = () => call({ method: 'GET' });

export const submitScore = entry => call({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(entry),
});
