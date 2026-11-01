import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOpenDate, closureForDate, stockholmDate, validDate, validateClosure } from '../closures.js';

const rows = [{ id: 1, start_date: '2026-12-24', end_date: '2027-01-06', message: 'Julstängt' }];
function mockClient(result) {
  return { from(table) {
    assert.equal(table, 'restaurant_closures');
    return { select() { return { order: async () => result }; } };
  } };
}

test('inclusive range crosses year; next day reopens', () => {
  for (const date of ['2026-12-24', '2026-12-31', '2027-01-06']) assert.equal(closureForDate(rows, date)?.id, 1);
  for (const date of ['2026-12-23', '2027-01-07']) assert.equal(closureForDate(rows, date), null);
});
test('single-day closure and overlaps remain closed independently', () => {
  const day = { id: 2, start_date: '2027-01-06', end_date: '2027-01-06', message: 'Röd dag' };
  assert.ok(closureForDate([day], '2027-01-06'));
  assert.equal(closureForDate([day], '2027-01-07'), null);
  assert.ok(closureForDate([...rows, day].filter((row) => row.id !== 1), '2027-01-06'));
});
test('invalid calendar dates and reversed ranges are rejected', () => {
  for (const date of ['', '2026-02-29', '2026-02-31', '2026-13-01', '2026-1-01', 'not a date']) assert.equal(validDate(date), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.ok(validateClosure('2026-12-25', '2026-12-24', 'Stängt'));
  assert.ok(validateClosure('2026-12-24', '2026-12-24', ' '));
  assert.ok(validateClosure('2026-12-24', '2026-12-24', 'a'.repeat(161)));
  assert.equal(validateClosure('2026-12-24', '2026-12-24', 'Semesterstängt'), null);
});
test('Stockholm calendar day handles winter, summer and DST boundaries', () => {
  assert.equal(stockholmDate(new Date('2026-12-23T23:30:00Z')), '2026-12-24');
  assert.equal(stockholmDate(new Date('2026-07-01T22:30:00Z')), '2026-07-02');
  assert.equal(stockholmDate(new Date('2026-10-25T01:30:00Z')), '2026-10-25');
});
test('submission reads latest dates rather than stale screen state', async () => {
  const result = await checkOpenDate(mockClient({ data: rows, error: null }), '2026-12-24');
  assert.equal(result.allowed, false);
  assert.match(result.message, /Julstängt/);
  assert.equal((await checkOpenDate(mockClient({ data: [], error: null }), '2026-12-24')).allowed, true);
});
test('network/schema errors block submissions instead of assuming open', async () => {
  assert.equal((await checkOpenDate(mockClient({ data: null, error: new Error('offline') }), '2026-12-24')).allowed, false);
  assert.equal((await checkOpenDate(mockClient({ data: null, error: null }), '2026-12-24')).allowed, false);
  assert.equal((await checkOpenDate(mockClient({ data: [], error: null }), 'invalid')).allowed, false);
});
