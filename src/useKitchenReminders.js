import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { kitchenReminderPlan, createKitchenReminderSync } from './kitchenReminderPlan';
const sync = createKitchenReminderSync(Notifications, Platform.OS === 'android');
export function useKitchenReminders(admin, orders) {
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    const plan = admin ? kitchenReminderPlan(orders) : [];
    sync(plan).then(() => {
      if (active) setStatus(admin
        ? 'Kökspåminnelse 30 min före beställningstiden. Håll kökets app inloggad så att nya beställningar hämtas.'
        : '');
    }).catch(error => {
      if (active && admin) setStatus(error.message || 'Kökspåminnelser kunde inte aktiveras.');
    });
    return () => { active = false; };
  }, [admin, orders]);
  return status;
}
