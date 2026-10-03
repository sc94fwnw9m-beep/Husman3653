# Order and menu fixes — release status

Based on main commit 2773d3dc2a0ae14062b1ff9eb62e373a71b0826f.
PR #3 is diverged and cannot be treated as the installed build 54 source.
This patch retains main's Supabase project, images, logo, categories, prices,
booking/catering behavior, and existing push registration/order audio.

## Implemented

- Authenticate admin using Supabase email/password; expose password input only
  inside the existing admin login panel. Owner-only database RLS remains required.
- Load native audio only when the admin view opens. Version/runtime becomes
  1.0.9 (distinct from PR #2's 1.0.8). A new native binary is required.
- Require an affected order row before showing completion or sending push.
  Verify Expo's ticket status; acceptance is not proof of device delivery.
- Guard duplicate submit/completion taps; release refresh locks after exceptions.
- Initialize weekly editing fields on login and synchronize them after adding a
  lunch dish, preventing stale fields from overwriting published dishes.
- Refuse ordering when menu retrieval fails or returns no published rows.
- Replace partial per-row menu publication with an atomic database RPC. Reject
  stale snapshots instead of overwriting another administrator's publication.
  No fallback to partial writes if the RPC has not been installed.

## Verification

Run `npm install --ignore-scripts` then `npm run verify:fixes`.
Tests parse the complete JSX and exercise authentication, update authorization,
push rejection, refresh recovery, duplicate submission, and runtime consistency.
An embedded PostgreSQL instance verifies the actual SQL function: publication,
inactive rows, stale edits, rollback after a mid-save failure, non-owner RLS,
and anonymous execution denial. This is a fixture, not the live Supabase schema.

## Required before merging or publishing

1. Inspect the live `menu_items`, `orders`, and `bookings` schema and RLS. Confirm
   the restaurant's Supabase Auth account exists. Anonymous clients must not read
   customer details or update/delete orders; menu writes must be owner-only.
   The repository's old weekly_menu SQL allows every authenticated user to write;
   do not reuse that policy as owner authorization.
2. Validate and install `supabase/migrations/20261003_atomic_menu_publication.sql`
   in the target project. It keeps current table grants/policies and uses security
   invoker. It does not grant menu table writes or bypass RLS. Verify column types,
   triggers, read access to inactive rows, and empty-string day conventions first.
3. Reconcile complete published menus in this project. Missing categories still
   retain existing hardcoded defaults. Prices 139/129/119 remain hardcoded; remote
   order-type pricing needs a verified schema and is not implemented by this patch.
   Existing cart entries retain captured prices; decide how to handle price changes
   while a customer is already ordering before changing that established behavior.
4. Identify the installed TestFlight build's commit/runtime/channel/update ID.
   Build 1.0.9 and test startup, dates, cart, auth, menu publication, orders, admin
   audio, and customer push on real devices. Do not publish the production OTA
   workflow as a substitute for native build verification.

No live database writes, builds, submissions, merges, or OTA releases were made
while preparing this patch. Push receipts/APNs credentials and device crash logs
remain unverified. Network retries can still duplicate an order if the server
accepted it but its response was lost; eliminating that requires verified database
idempotency, rather than guessing the live order schema.
