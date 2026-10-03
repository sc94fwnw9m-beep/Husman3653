# Order and menu fixes — release status

Based on main commit 2773d3dc2a0ae14062b1ff9eb62e373a71b0826f.
This branch retains main's Supabase project, images, logo, categories, prices,
booking/catering behavior, and existing push registration/order audio.

## Implemented

- Authenticate admin using Supabase email/password, then require a positive
  server-side `is_restaurant_admin` result. Missing authorization/RPC fails closed
  and signs out. The existing owner-code UI is retained as an additional check.
- Add an owner allowlist in a private schema and explicit table RLS policies.
  Only the verified existing owner can read customer orders/bookings, change
  menus, complete orders, and delete finished orders. Customers retain public
  menu reading and creation of new orders/bookings. Revoke unnecessary table
  privileges, including TRUNCATE. No customer rows are modified by this migration.
- Lazy-load native audio in the admin view. Version/runtime is 1.0.9, distinct
  from PR #2's 1.0.8. A compatible new native binary is required.
- Confirm affected order rows and Expo push-ticket acceptance before reporting
  success. Ticket acceptance is not proof of delivery to a device.
- Guard duplicate taps, release refresh locks after exceptions, initialize menu
  editing fields, and block orders when no published menu can be confirmed.
- Publish menu sections through one atomic RPC with stale-snapshot rejection;
  verify owner authorization in the RPC as well as table RLS. No partial fallback.

## Verification

Run `npm install --ignore-scripts` then `npm run verify:fixes`.
Tests parse the complete JSX and exercise authorization failures/success,
order-update rejection, push failure, refresh recovery, duplicate submission,
menu validation and runtime consistency.
An embedded PostgreSQL instance runs both actual migrations against permissive
fixture policies, then verifies owner access, customer order/booking creation,
non-owner denial, TRUNCATE denial, finished-order deletion, private allowlist
protection, atomic publication, stale edits and rollback after a mid-save failure.
These checks do not substitute for authenticated API and native-device tests.

## Coordinated rollout required

1. Verify the existing owner Auth account and real password login. Inside the
   first migration transaction, supply `husman.owner_email` using SET LOCAL.
   Never put the owner's email/password in the repository. The migration rejects
   missing/ambiguous/unconfirmed accounts, a different existing admin, and unknown
   table policies rather than silently changing other permissions.
2. Validate current schema, identity sequences, table policies and triggers. Test
   both `20261003_01_owner_authorization.sql` and
   `20261003_atomic_menu_publication.sql` together in an isolated environment.
   Preserve customer inserts without RETURNING: anonymous reads of customer rows
   are intentionally denied. Old admin builds without real authentication lose
   access after secure policies are activated.
3. Reconcile the published menu with the approved source. Verify all names/prices
   and menu refresh on customer devices. Missing categories still retain defaults.
4. Identify installed TestFlight commit/runtime/channel/update ID. Verify a 1.0.9
   native binary: startup, date selection, cart, real owner login, menu editing,
   orders, bookings, admin sound and customer push. Coordinate the policy/function
   activation with the working owner app. Do not publish an untested production
   OTA or treat this draft as a released fix.

## Remaining limitations

The 139/129/119 order-type prices remain unchanged and hardcoded. Existing cart
entries retain captured prices. Order totals are client-provided; server-side
price calculation is not implemented. Duplicate taps are guarded, but an order
can still be duplicated after a lost network response and manual resubmission;
server-side idempotency needs a separate verified change. Push receipts/APNs and
native device crash logs remain unverified. The production authorization rollout
and native release are not complete merely because the local tests pass.
