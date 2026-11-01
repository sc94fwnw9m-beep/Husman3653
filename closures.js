// Calendar dates are strings, never UTC-midnight timestamps.
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function stockholmDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function validateClosure(start, end, message) {
  if (!validDate(start) || !validDate(end)) return 'Välj giltiga från- och tilldatum.';
  if (end < start) return 'Tilldatum får inte vara före fråndatum.';
  if (!message.trim() || message.trim().length > 160) return 'Skriv ett meddelande på 1–160 tecken.';
  return null;
}

export function closureForDate(closures, date) {
  if (!validDate(date)) return null;
  return closures.find((item) => validDate(item.start_date) && validDate(item.end_date)
    && item.start_date <= date && date <= item.end_date) || null;
}

export function closureText(closure) {
  return `${closure.message} • Stängt ${closure.start_date}–${closure.end_date} (till och med).`;
}

export async function readClosures(client) {
  const { data, error } = await client.from('restaurant_closures')
    .select('id,start_date,end_date,message').order('start_date', { ascending: true });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Stängda dagar kunde inte hämtas.');
  return data;
}

export async function checkOpenDate(client, date) {
  if (!validDate(date)) return { allowed: false, message: 'Välj ett giltigt datum.' };
  try {
    const closures = await readClosures(client);
    const closure = closureForDate(closures, date);
    return closure ? { allowed: false, message: closureText(closure) } : { allowed: true };
  } catch {
    return { allowed: false, message: 'Öppettiderna kunde inte kontrolleras. Försök igen när du har internet.' };
  }
}
