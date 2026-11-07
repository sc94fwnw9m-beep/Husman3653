import test from 'node:test';
import assert from 'node:assert/strict';
import { getBookingTimeError } from '../booking-time.js';
const now = new Date('2026-11-07T18:00:00Z');
test('table bookings reject weekends and opening/closing boundaries', () => {
  for (const [date, time] of [['2026-11-08','08:30'], ['2026-11-14','12:00'], ['2026-11-09','07:59'], ['2026-11-09','14:00']]) assert.ok(getBookingTimeError(date,time,'table',now));
  for (const time of ['08:00','08:30','13:30','13:59']) assert.equal(getBookingTimeError('2026-11-09',time,'table',now),null);
});
test('event requests allow weekends and evenings but require future valid times', () => {
  assert.equal(getBookingTimeError('2026-11-08','18:30','event',now),null);
  assert.equal(getBookingTimeError('2026-11-09','20:00','event',now),null);
  for (const [date,time] of [['2026-11-07','18:59'],['2026-02-30','12:00'],['2026-11-08','25:00']]) assert.ok(getBookingTimeError(date,time,'event',now));
});
