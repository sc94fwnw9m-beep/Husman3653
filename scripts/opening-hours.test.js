import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HOURS, openingSlots, openingTimeError, fetchOpeningHours } from '../opening-hours.js';
import { getBookingTimeError } from '../booking-time.js';
const now = new Date('2026-11-14T18:00:00Z');
const changed = DEFAULT_HOURS.map(h => ({ ...h, open: '09:15', close: '16:45' }));
test('changed weekday hours replace fixed slots and preserve exact boundaries', () => {
  const slots = openingSlots(changed, '2026-11-16');
  assert.equal(slots[0], '09:15'); assert.equal(slots.at(-1), '16:45');
  assert(slots.includes('16:30')); assert(!slots.includes('08:00'));
  assert.equal(openingTimeError(changed, '2026-11-16', '16:45'), null);
  assert(openingTimeError(changed, '2026-11-16', '16:46'));
});
test('tables use changed hours but exclude closing time; events retain evening/weekend access', () => {
  assert.equal(getBookingTimeError('2026-11-16','16:30','table',now,changed),null);
  assert(getBookingTimeError('2026-11-16','16:45','table',now,changed));
  assert(getBookingTimeError('2026-11-16','09:00','table',now,changed));
  assert.equal(getBookingTimeError('2026-11-15','20:00','event',now,changed),null);
});
test('closed days and invalid calendar dates have no slots', () => {
  const hours = changed.map((h,i)=>({...h,closed:i===0||h.closed}));
  assert.deepEqual(openingSlots(hours,'2026-11-16'),[]);
  assert.deepEqual(openingSlots(hours,'2026-02-30'),[]);
});
test('fetch validates content and fails on unavailable or malformed data', async () => {
  assert.deepEqual((await fetchOpeningHours(async()=>({ok:true,json:async()=>({openingHours:changed})}))).hours,changed);
  await assert.rejects(fetchOpeningHours(async()=>({ok:false})));
  await assert.rejects(fetchOpeningHours(async()=>({ok:true,json:async()=>({openingHours:[{}]})})));
});
