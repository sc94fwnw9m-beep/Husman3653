export const FROZEN_CATEGORY = 'Frysta matlådor';
export const FROZEN_SLOTS = 20;
export const FROZEN_PACKS = [
  { count: 1, price: 65 },
  { count: 5, price: 290 },
  { count: 10, price: 550 },
];

// Ignore the three old package-only menu rows, without inventing dishes.
export function frozenDishes(items = []) {
  const names = new Set();
  return items.filter(Array.isArray).map(([name]) => String(name || '').trim())
    .filter((name) => {
      if (!name || /^(1 matlåda|5 matlådor|10 matlådor)$/i.test(name)) return false;
      if (names.has(name)) return false;
      names.add(name); return true;
    });
}

export function frozenRows(items = []) {
  const names = frozenDishes(items);
  return Array.from({ length: FROZEN_SLOTS }, (_, index) => names[index] || '');
}

export function validateFrozenRows(rows) {
  if (!Array.isArray(rows) || rows.length !== FROZEN_SLOTS) return 'Menyn ska ha 20 rader.';
  const names = rows.map((name) => name.trim()).filter(Boolean);
  if (names.some((name) => name.length > 160)) return 'Ett maträttsnamn får vara högst 160 tecken.';
  if (new Set(names.map((name) => name.toLocaleLowerCase('sv-SE'))).size !== names.length) {
    return 'Samma maträtt finns på flera rader. Skriv varje maträtt en gång.';
  }
  if (names.some((name) => /^(1 matlåda|5 matlådor|10 matlådor)$/i.test(name))) {
    return 'Skriv maträttens namn, till exempel Kalops med potatis.';
  }
  return null;
}

export function selectionCount(selections, name) {
  const count = Object.prototype.hasOwnProperty.call(selections, name) ? selections[name] : 0;
  return Number.isInteger(count) && count > 0 ? count : 0;
}

export function selectedFrozenItems(names, selections) {
  return names.map((name) => ({ name, qty: selectionCount(selections, name) })).filter((item) => item.qty > 0);
}

export function makeFrozenBundle(names, selections, packCount) {
  const pack = FROZEN_PACKS.find((item) => item.count === packCount);
  const items = selectedFrozenItems(names, selections);
  if (!pack || items.reduce((sum, item) => sum + item.qty, 0) !== pack.count) return null;
  return {
    name: `${pack.count} ${pack.count === 1 ? 'fryst matlåda' : 'frysta matlådor'}: ${items.map((item) => `${item.qty} × ${item.name}`).join(', ')}`,
    price: pack.price,
    frozenPack: pack.count,
    frozenItems: items,
  };
}

export async function checkFrozenCart(client, cart) {
  const bundles = cart.filter((item) => item.category === FROZEN_CATEGORY);
  if (!bundles.length) return null;
  try {
    const { data, error } = await client.from('menu_items').select('name,active')
      .eq('category', FROZEN_CATEGORY).eq('day', '');
    if (error || !Array.isArray(data)) throw error || new Error('Ingen meny');
    const available = new Set(frozenDishes(data.filter((item) => item.active !== false).map((item) => [item.name])));
    for (const bundle of bundles) {
      const pack = FROZEN_PACKS.find((item) => item.count === bundle.frozenPack);
      const items = bundle.frozenItems;
      if (!pack || Number(bundle.price) !== pack.price || !Number.isInteger(bundle.qty) || bundle.qty < 1
        || !Array.isArray(items) || items.length === 0
        || items.some((item) => !available.has(item.name) || !Number.isInteger(item.qty) || item.qty < 1)
        || items.reduce((sum, item) => sum + item.qty, 0) !== pack.count) {
        return 'Menyn för frysta matlådor har ändrats. Ta bort paketet i kundkorgen och välj matlådorna igen.';
      }
    }
    return null;
  } catch {
    return 'Utbudet av frysta matlådor kunde inte kontrolleras. Kontrollera internet och försök igen.';
  }
}
