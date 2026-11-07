import { validDate } from './closures.js';
import { getOrderTimeError } from './order-time.js';

export function getBookingTimeError(date, time, kind = 'table', now = new Date()) {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return 'Välj ett giltigt datum och en tid (HH:MM).';
  }
  if (kind !== 'event') {
    const error = getOrderTimeError(date, time, now);
    if (error) return error;
    if (time < '08:00' || time >= '14:00') {
      return 'Bord kan bokas måndag–fredag 08:00–14:00. Välj en tid före stängning.';
    }
    return null;
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const current = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  return `${date}T${time}:00` <= current
    ? 'Datumet eller tiden har passerat. Välj ett nytt datum och en kommande tid.' : null;
}
