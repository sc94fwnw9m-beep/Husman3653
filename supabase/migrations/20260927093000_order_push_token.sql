-- The customer's Expo push token belongs to the order, so the ready notification
-- can be addressed to the device that placed that order.
alter table public.orders
  add column if not exists expo_push_token text;

