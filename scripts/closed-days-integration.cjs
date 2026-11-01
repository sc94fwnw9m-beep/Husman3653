const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { parse } = require('@babel/parser');
const { PGlite } = require('@electric-sql/pglite');

async function run() {
  const helpers = await import('../closures.js');
  const frozenHelpers = await import('../frozenMeals.js');
  const source = fs.readFileSync('App.js', 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  parse(fs.readFileSync('ClosedDays.js', 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  const app = ast.program.body.find((node) => node.type === 'ExportDefaultDeclaration').declaration;
  function fn(name, context) {
    const node = app.body.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === name);
    const scope = { console, ...helpers, ...frozenHelpers, ...context };
    vm.createContext(scope);
    vm.runInContext(source.slice(node.start, node.end), scope);
    return scope[name];
  }
  const rows = [{ id: 1, start_date: '2026-12-24', end_date: '2027-01-06', message: 'Julstängt' }];
  const alerts = [];
  let inserts = 0;
  let offline = false;
  let open = false;
  const client = { from(table) {
    if (table === 'restaurant_closures') return { select: () => ({ order: async () => ({
      data: open ? [] : rows, error: offline ? new Error('offline') : null,
    }) }) };
    assert.ok(['orders', 'bookings'].includes(table));
    return { insert: async () => { inserts++; return { error: null }; } };
  } };
  const context = {
    Alert: { alert: (...args) => alerts.push(args) }, supabase: client,
    orderSubmitInProgress: { current: false }, bookingSubmitInProgress: { current: false },
    menuAvailable: true, cart: [{ name: 'Fixture' }], customerName: 'Fixture', customerPhone: '123',
    orderDate: '2026-12-24', orderTime: '12:00', message: '', total: 139, orderType: 'Äta här',
    expoPushToken: '', lunchReservationError: () => null,
    bookingName: 'Fixture', bookingPhone: '123', bookingDate: '2026-12-24', bookingTime: '12:00',
    bookingGuests: '2', bookingMessage: '',
    setCart() {}, setCustomerName() {}, setCustomerPhone() {}, setMessage() {},
    setOrderDate() {}, setOrderTime() {}, setShowCart() {}, setBookingDate() {}, setBookingTime() {},
    setBookingName() {}, setBookingPhone() {}, setBookingGuests() {}, setBookingMessage() {},
  };
  await fn('sendOrder', context)();
  await fn('bookTable', context)('table');
  await fn('bookTable', context)('event');
  assert.equal(inserts, 0);
  assert.ok(alerts.every((item) => item[1].includes('Julstängt')));
  assert.equal(context.orderSubmitInProgress.current, false);
  assert.equal(context.bookingSubmitInProgress.current, false);
  offline = true;
  await fn('sendOrder', context)(); await fn('bookTable', context)();
  assert.equal(inserts, 0);
  offline = false; open = true;
  await fn('sendOrder', context)(); await fn('bookTable', context)();
  assert.equal(inserts, 2);

  let resolveRead;
  const lockedClient = { from(table) {
    if (table === 'restaurant_closures') return { select: () => ({ order: () => new Promise((resolve) => { resolveRead = resolve; }) }) };
    return { insert: async () => { inserts++; return { error: null }; } };
  } };
  const send = fn('sendOrder', { ...context, supabase: lockedClient });
  const pending = send(); await send(); resolveRead({ data: [], error: null }); await pending;
  assert.equal(inserts, 3);
  const book = fn('bookTable', { ...context, supabase: lockedClient });
  const pendingBook = book(); await book(); resolveRead({ data: [], error: null }); await pendingBook;
  assert.equal(inserts, 4);

  let dateValue;
  fn('selectAvailableDate', { ...context, closedDays: { closures: rows }, formatDate: () => '2026-12-24' })(new Date(), (date) => { dateValue = date; });
  assert.equal(dateValue, '');
  let cartChanged = false;
  fn('addToCart', { ...context, closedDays: { closures: rows }, nextLunchDate: () => '2026-12-24',
    setCart: () => { cartChanged = true; }, mealPrice: () => 139 })('Fixture', 139, 'Lunch', 'Torsdag');
  assert.equal(cartChanged, false);
  console.log('PASS: actual order/table/catering functions block closures and network errors, allow open dates, reject duplicate taps; date picker and lunch cart guard closed dates.');

  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
    create schema husman_private;
    create table husman_private.restaurant_admins(user_id uuid primary key references auth.users(id));
    insert into husman_private.restaurant_admins values ('11111111-1111-1111-1111-111111111111');
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create function public.is_restaurant_admin() returns boolean language sql stable security definer set search_path='' as $$
      select exists(select 1 from husman_private.restaurant_admins where user_id=(select auth.uid())) $$;
    revoke all on function public.is_restaurant_admin() from public,anon;
    grant execute on function public.is_restaurant_admin() to authenticated;
    create table orders(id bigint generated always as identity primary key, pickup_date date, status text default 'Ny');
    create table bookings(id bigint generated always as identity primary key, booking_date date);
    grant usage on schema public,auth to anon,authenticated;
    grant insert,update,select on orders,bookings to anon,authenticated;
    grant usage on all sequences in schema public to anon,authenticated;`);
  const sql = fs.readFileSync('supabase/migrations/20261101_closed_days.sql', 'utf8');
  await db.exec(sql); await db.exec(sql); // Idempotent migration.
  assert.equal((await db.query('select count(*)::int as n from restaurant_closures')).rows[0].n, 0);
  await db.exec('set role anon');
  assert.equal((await db.query('select * from restaurant_closures')).rows.length, 0);
  await assert.rejects(() => db.exec("insert into restaurant_closures(start_date,end_date,message) values('2026-12-24','2027-01-06','BAD')"), /permission denied/);
  await db.exec("reset role; set role authenticated; set test.uid='22222222-2222-2222-2222-222222222222';");
  await assert.rejects(() => db.exec("insert into restaurant_closures(start_date,end_date,message) values('2026-12-24','2027-01-06','BAD')"), /row-level security/);
  await db.exec("set test.uid='11111111-1111-1111-1111-111111111111';");
  await db.exec("insert into restaurant_closures(start_date,end_date,message) values('2026-12-24','2027-01-06','Julstängt');");
  await assert.rejects(() => db.exec("insert into restaurant_closures(start_date,end_date,message) values('2026-12-25','2026-12-24','BAD')"), /closure_dates_ordered/);
  await assert.rejects(() => db.exec("insert into restaurant_closures(start_date,end_date,message) values('2026-12-24','2026-12-24',' ')"), /closure_message_length/);
  await db.exec('reset role; set role anon');
  assert.equal((await db.query('select * from restaurant_closures')).rows.length, 1);
  for (const date of ['2026-12-24', '2026-12-31', '2027-01-06']) {
    await assert.rejects(() => db.exec(`insert into orders(pickup_date) values('${date}')`), /RESTAURANT_CLOSED/);
    await assert.rejects(() => db.exec(`insert into bookings(booking_date) values('${date}')`), /RESTAURANT_CLOSED/);
  }
  for (const date of ['2026-12-23', '2027-01-07']) {
    await db.exec(`insert into orders(pickup_date) values('${date}'); insert into bookings(booking_date) values('${date}');`);
  }
  await assert.rejects(() => db.exec("update orders set pickup_date='2026-12-24'"), /RESTAURANT_CLOSED/);
  await assert.rejects(() => db.exec("update bookings set booking_date='2026-12-24'"), /RESTAURANT_CLOSED/);
  await db.exec("reset role; set role authenticated; set test.uid='22222222-2222-2222-2222-222222222222';");
  assert.equal((await db.query("update restaurant_closures set message='BAD' returning id")).rows.length, 0);
  assert.equal((await db.query('delete from restaurant_closures returning id')).rows.length, 0);
  await db.exec("set test.uid='11111111-1111-1111-1111-111111111111';");
  assert.equal((await db.query("update restaurant_closures set message='Semester' returning id")).rows.length, 1);
  await db.exec("insert into restaurant_closures(start_date,end_date,message) values('2026-12-23','2026-12-23','En dag');");
  await db.exec("update orders set status='Maten färdig' where pickup_date='2026-12-23';");
  assert.equal((await db.query("select status from orders where pickup_date='2026-12-23'")).rows[0].status, 'Maten färdig');
  assert.equal((await db.query("delete from restaurant_closures where message='Semester' returning id")).rows.length, 1);
  await db.exec("reset role; set role anon; insert into orders(pickup_date) values('2026-12-24');");
  await assert.rejects(() => db.exec("insert into orders(pickup_date) values('2026-12-23')"), /RESTAURANT_CLOSED/);
  await db.close();
  console.log('PASS: PostgreSQL migration twice, no preset closures, public read, anonymous/non-owner write denial, owner CRUD, inclusive insert/update guards, reopening after deletion, existing order status updates preserved.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
