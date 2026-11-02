# Stängda dagar och semester

Status (2026-11-01): database migration applied and verified; production OTA published successfully for iOS and Android. No closure dates set. Device reception remains to be checked.

## Behavior

- Owner selects a single day or an inclusive date range and a public message, then saves.
- Owner can edit and remove periods. Overlaps are allowed; removing one does not cancel another.
- Customers see current and upcoming closures on menu and cart screens.
- Order, table booking and catering/event date pickers reject known closed dates.
- Every submission checks fresh shared data. If that check fails, no order/booking is sent.
- Database triggers reject closed dates even from old app versions or stale clients.
- Dates are calendar dates. The current day uses Europe/Stockholm. Expired closures no longer block future dates; no scheduled reopening job is needed.
- Existing orders/bookings are not deleted or canceled when the owner closes a date. Coordinate any already accepted requests manually.

## Database setup (required before the app update)

1. Back up and run `supabase/migrations/20261101_closed_days.sql` in the existing app Supabase project.
2. The migration reuses the existing `is_restaurant_admin()` authorization function and private owner role. It stops if that function is absent. Never grant anonymous write access or embed a database service key in the app.
3. Sign in through the existing owner login, then **Inställningar → Öppettider & stängda dagar**. No extra login or password is introduced.
4. Verify anonymous reads, anonymous/unlisted-account write denial, authorized save/edit/delete, and both order and booking trigger rejections. Do not insert production test closures without agreeing on dates first.

The migration adds no real closure dates. It can be run again. Public visitors may read dates/messages only; writes require the existing verified owner role.

## Deployment / source verification

The default branch declares app version **1.0.7**, but the newer `feature/offer-notifications-ota-20261010` branch declares **1.0.9**, runtime policy `appVersion`, and contains price settings, offers, verified owner login and weekday lunch reservations. This feature is based on that newer branch at `711f5fd`, not on main. The Expo dashboard confirmed the latest production OTA source is the same `711f5fd` commit. No runtime or native configuration was changed.

No native packages or app identifiers were changed. An OTA update is possible only for installed builds with working Expo Updates, a matching runtime and the correct production channel. The `.eas/workflows/update-ios.yml` workflow publishes platform `all` to channel `production`, with no native build or store submission job.

After the database setup and source/runtime verification, use the authenticated Expo account to publish with `eas update --channel production --platform all --message "Stängda dagar och semester"` from the verified current project. Do not run a native build for this feature. Check the resulting update group, platform/runtime mapping and a real device before declaring deployment complete.

Activation used the owner’s authenticated GitHub, Supabase and Expo browser sessions. The live database check confirmed zero closure periods, row-level security enabled, public read allowed, public insert denied, and both order/booking date triggers installed. Published update group: `bf923114-3cd2-4d4f-8d8d-7dc45fb6b310`, runtime `1.0.9`, channel/branch `production`. Production OTA run: `01a19882-a5b6-718c-8615-fc99b7f32118`, source commit `73018f9`. The runtime source files were compared against the tested local files and match exactly.

## Validation

`node --test scripts/closures.test.js` exercises inclusive boundaries, one-day closures, overlap, invalid dates, Stockholm date rollover/DST, expired periods, stale data refresh and failed reads. JSX, form/submission interaction and PostgreSQL migration tests are also run during preparation. Live database setup and device delivery remain deployment checks.
