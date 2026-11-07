import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function stockCount(stock, name) {
  const count = Object.prototype.hasOwnProperty.call(stock || {}, name) ? stock[name] : 0;
  return Number.isInteger(count) && count >= 0 ? count : 0;
}

export function cartFrozenCounts(cart = []) {
  const counts = Object.create(null);
  for (const bundle of cart) {
    if (bundle.category !== 'Frysta matlådor') continue;
    for (const item of bundle.frozenItems || []) {
      counts[item.name] = (counts[item.name] || 0) + item.qty * bundle.qty;
    }
  }
  return counts;
}

export function useFrozenStock(client) {
  const [stock, setStock] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const { data, error } = await client.from('frozen_meal_stock').select('name,quantity');
        if (error || !Array.isArray(data)) throw error || new Error('Lagersaldo saknas');
        if (active) { setStock(Object.fromEntries(data.map(row => [row.name, row.quantity]))); setLoaded(true); }
      } catch { if (active) setLoaded(false); }
    }
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 15000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [client, revision]);
  return { stock, loaded, refresh: () => setRevision(value => value + 1) };
}
