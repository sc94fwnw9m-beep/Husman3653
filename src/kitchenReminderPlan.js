const PREFIX = 'husman-kitchen-30:';
const TYPE = 'kitchen-pickup-reminder';
export function stockholmPickupTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}(:\d{2})?$/.test(time || '')) return NaN;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (hour > 23 || minute > 59) return NaN;
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  if (new Date(wall).toISOString().slice(0,10) !== date) return NaN;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23',
  });
  let instant = wall;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
    const rendered = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    if (rendered === wall) return instant;
    instant += wall - rendered;
  }
  return NaN;
}
export function kitchenReminderPlan(orders, now = Date.now()) {
  return (orders || []).filter(order => ['Ny', 'Accepterad'].includes(order.status || 'Ny'))
    .map(order => {
      const at = stockholmPickupTime(order.pickup_date, order.pickup_time) - 30 * 60000;
      const time = String(order.pickup_time || '').slice(0,5);
      return { identifier: PREFIX + order.id, at, orderId: String(order.id),
        body: `30 minuter kvar till beställning #${order.id} kl. ${time}. Förbered maten.` };
    }).filter(item => Number.isFinite(item.at) && item.at > now)
    .sort((a,b) => a.at - b.at).slice(0,40);
}
// Serial reconciliation and stable IDs avoid duplicate alarms during refreshes.
export function createKitchenReminderSync(notifications, isAndroid = false) {
  let queue = Promise.resolve();
  return function sync(plan) {
    const job = async () => {
      const existing = await notifications.getAllScheduledNotificationsAsync();
      const wanted = new Map(plan.map(item => [item.identifier,item]));
      const retained = new Set();
      for (const request of existing) {
        if (!request.identifier.startsWith(PREFIX)) continue;
        const item = wanted.get(request.identifier);
        if (item && Number(request.content.data?.reminderAt) === item.at) retained.add(request.identifier);
        else await notifications.cancelScheduledNotificationAsync(request.identifier);
      }
      if (!plan.length) return;
      if (isAndroid) await notifications.setNotificationChannelAsync('kitchen-reminders', {
        name:'Kökets påminnelser', importance:notifications.AndroidImportance.HIGH,
        sound:'default', vibrationPattern:[0,500,200,500],
      });
      const permission = await notifications.getPermissionsAsync();
      if (!permission.granted && permission.ios?.status !== 3) throw new Error('Tillåt notiser för kökets påminnelser.');
      for (const item of plan) {
        if (retained.has(item.identifier) || item.at <= Date.now()) continue;
        await notifications.scheduleNotificationAsync({
          identifier:item.identifier,
          content:{ title:'Husman · Kökspåminnelse', body:item.body, sound:'default',
            data:{type:TYPE,orderId:item.orderId,reminderAt:item.at} },
          trigger:{type:notifications.SchedulableTriggerInputTypes.DATE, date:new Date(item.at),
            ...(isAndroid ? {channelId:'kitchen-reminders'} : {})},
        });
      }
    };
    queue = queue.catch(() => {}).then(job);
    return queue;
  };
}
