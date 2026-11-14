export const HOURS_URL = 'https://www.husman-lunch.se/api/hours';
export const HOURS_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
export const DEFAULT_HOURS = HOURS_DAYS.map((_, i) => ({ closed: i > 4, open: '08:00', close: '14:00' }));
export function validHours(hours) {
  return Array.isArray(hours) && hours.length === 7 && hours.every(h => h &&
    typeof h.closed === 'boolean' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h.open) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(h.close) && (h.closed || h.open < h.close));
}
export function hoursSummary(hours) {
  const groups = [];
  hours.forEach((h, i) => {
    const last = groups[groups.length - 1];
    if (last && last.h.closed === h.closed && (h.closed || (last.h.open === h.open && last.h.close === h.close))) last.end = i;
    else groups.push({ start: i, end: i, h });
  });
  return groups.map(g => `${HOURS_DAYS[g.start]}${g.end !== g.start ? '–' + HOURS_DAYS[g.end] : ''}: ${g.h.closed ? 'Stängt' : g.h.open + '–' + g.h.close}`).join(' • ');
}
export function hoursForDate(hours, date) {
  if (!validHours(hours) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== date) return null;
  return hours[(d.getUTCDay()+6)%7];
}
export function openingTimeError(hours, date, time) {
  const h = hoursForDate(hours, date);
  if (!h || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return 'Välj ett giltigt datum och en tid.';
  if (h.closed) return 'Restaurangen är stängd den dagen. Välj ett annat datum.';
  if (time < h.open || time > h.close) return `Välj en tid inom öppettiderna ${h.open}–${h.close}.`;
  return null;
}
export function openingSlots(hours, date) {
  const h = hoursForDate(hours, date);
  if (!h || h.closed) return [];
  const minutes = t => Number(t.slice(0,2))*60+Number(t.slice(3));
  const label = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  const result = [h.open];
  // Preserve exact opening/closing times as well as the familiar half-hour choices.
  for (let m = Math.floor(minutes(h.open)/30)*30+30; m < minutes(h.close); m += 30) result.push(label(m));
  result.push(h.close);
  return result;
}
export async function fetchOpeningHours(fetcher = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(HOURS_URL, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Öppettiderna kunde inte hämtas.');
    const content = await response.json();
    const hours = content.openingHours === undefined ? DEFAULT_HOURS : content.openingHours;
    if (!validHours(hours)) throw new Error('Öppettiderna kunde inte kontrolleras.');
    return { hours, notice: typeof content.hoursNotice === 'string' ? content.hoursNotice : '' };
  } finally { clearTimeout(timeout); }
}
