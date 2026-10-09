// Datas na hora de Portugal (partilhado pelas funções do Netlify).
const TZ = 'Europe/Lisbon';

// Data (AAAA-MM-DD) em Portugal
export const lisbonDay = date => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

// Soma (ou subtrai) dias a uma data AAAA-MM-DD
export const addDays = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

// Início do dia e da semana (segunda-feira) em Portugal
export function periodStarts(now = new Date()) {
  const day = lisbonDay(now);
  const weekday = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7;     // 0 = segunda-feira
  return { day, week: addDays(day, -weekday) };
}
