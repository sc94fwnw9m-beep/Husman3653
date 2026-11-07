// Compare restaurant wall time, independent of the phone's time zone.
export function getOrderTimeError(date, time, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return 'Välj ett giltigt datum och en tid.';
  }
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return 'Välj ett giltigt datum.';
  }
  if ([0, 6].includes(parsed.getUTCDay())) {
    return 'Restaurangen är stängd lördag och söndag. Välj en vardag.';
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const current = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  if (`${date}T${time}:00` <= current) {
    return 'Datumet eller tiden har passerat. Välj ett nytt datum och en kommande tid.';
  }
  return null;
}
