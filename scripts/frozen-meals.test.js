import test from 'node:test';
import assert from 'node:assert/strict';
import { FROZEN_CATEGORY, frozenDishes, frozenRows, makeFrozenBundle,
  checkFrozenCart, validateFrozenRows } from '../frozenMeals.js';

const menu = [['Kalops med potatis', 65], ['Kyckling med ris', 65]];
test('owner receives exactly twenty empty rows without fabricated dishes', () => {
  const rows = frozenRows([['1 matlåda', 65], ['5 matlådor', 290], ['10 matlådor', 550]]);
  assert.equal(rows.length, 20); assert.ok(rows.every((row) => row === ''));
  assert.deepEqual(frozenDishes(menu), menu.map(([name]) => name));
  assert.equal(validateFrozenRows(rows), null);
  rows[19] = 'Kalops med potatis'; assert.equal(validateFrozenRows(rows), null);
  rows[0] = ' kalops med potatis '; assert.match(validateFrozenRows(rows), /flera rader/);
});
test('mixed choices must match exactly one, five or ten meals at the existing price', () => {
  const names = frozenDishes(menu);
  assert.equal(makeFrozenBundle(names, { 'Kalops med potatis': 1 }, 1)?.price, 65);
  const five = makeFrozenBundle(names, { 'Kalops med potatis': 2, 'Kyckling med ris': 3 }, 5);
  assert.equal(five.price, 290); assert.equal(five.frozenItems.length, 2);
  assert.match(five.name, /2 × Kalops/); assert.match(five.name, /3 × Kyckling/);
  assert.equal(makeFrozenBundle(names, { 'Kalops med potatis': 10 }, 10)?.price, 550);
  assert.equal(makeFrozenBundle(names, { 'Kalops med potatis': 4 }, 5), null);
  assert.equal(makeFrozenBundle(names, { 'Kalops med potatis': 6 }, 5), null);
  assert.equal(makeFrozenBundle(names, { 'Kalops med potatis': 2 }, 2), null);
  assert.equal(makeFrozenBundle(names, { 'Borttagen rätt': 5 }, 5), null);
});
function client(data, error = null) {
  return { from(table) { assert.equal(table, 'menu_items'); return { select: () => ({
    eq: (_key, category) => { assert.equal(category, FROZEN_CATEGORY); return { eq: async () => ({ data, error }) }; },
  }) }; } };
}
test('checkout rechecks dish availability and preserves exact package quantities and price', async () => {
  const bundle = makeFrozenBundle(frozenDishes(menu), { 'Kalops med potatis': 2, 'Kyckling med ris': 3 }, 5);
  const cart = [{ ...bundle, category: FROZEN_CATEGORY, qty: 2 }];
  const current = menu.map(([name]) => ({ name, active: true }));
  assert.equal(await checkFrozenCart(client(current), cart), null);
  assert.match(await checkFrozenCart(client([{ name: menu[0][0], active: false }]), cart), /ändrats/);
  assert.match(await checkFrozenCart(client(null, new Error('offline')), cart), /internet/);
  assert.match(await checkFrozenCart(client(current), [{ ...cart[0], price: 1 }]), /ändrats/);
  assert.match(await checkFrozenCart(client(current), [{ ...cart[0], frozenItems: [{ name: menu[0][0], qty: 4 }] }]), /ändrats/);
  assert.equal(await checkFrozenCart({ from() { throw Error('should not read'); } }, [{ category: 'Lunch' }]), null);
});
