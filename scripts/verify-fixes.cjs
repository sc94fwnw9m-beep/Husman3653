const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const { parse } = require('@babel/parser');
const { PGlite } = require('@electric-sql/pglite');
const source = fs.readFileSync('App.js', 'utf8');
const ast = parse(source, {sourceType: 'module', plugins: ['jsx']});
const app = ast.program.body.find(n => n.type === 'ExportDefaultDeclaration').declaration;
function fn(name, context) {
  const n = app.body.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name);
  assert(n, name);
  const sandbox = {console, ...context};
  vm.createContext(sandbox);
  vm.runInContext(source.slice(n.start, n.end), sandbox);
  return sandbox[name];
}
const alerts = [];
const Alert = {alert: (...args) => alerts.push(args)};
async function checks() {
  let entered = false;
  const loginCtx = {Alert, OWNER_CODE: '3653', ownerCode: '3653', adminEmail: 'test@example.com',
    adminPassword: 'test', weeklyLunch: {Måndag: ['A','B','C']}, editDay:'Måndag',
    setEditDish1(){},setEditDish2(){},setEditDish3(){},setAdminPassword(){},
    setAdmin: value => entered=value,
    supabase: {auth:{signInWithPassword:async()=>({data:{session:null},error:{message:'denied'}})}}};
  await fn('login', loginCtx)(); assert.equal(entered,false);
  loginCtx.supabase.auth.signInWithPassword=async()=>({data:{session:{}},error:null});
  await fn('login',loginCtx)(); assert.equal(entered,true);
  let sends=0;
  const readyCtx = {Alert,readyOrderIds:{current:new Set()},loadOrders:async()=>{},
    fetch:async()=>{sends++;return {ok:true,json:async()=>({data:{status:'ok'}})}},
    supabase:{from:()=>({update:()=>({eq:()=>({neq:()=>({select:async()=>({data:[],error:null})})})})})}};
  await fn('foodReady',readyCtx)({id:1,push_token:'token'});assert.equal(sends,0);
  readyCtx.supabase.from=()=>({update:()=>({eq:()=>({neq:()=>({select:async()=>({data:[{id:1}],error:null})})})})});
  await fn('foodReady',readyCtx)({id:1,push_token:'token'});assert.equal(sends,1);
  readyCtx.fetch=async()=>({ok:true,json:async()=>({data:{status:'error'}})});
  await fn('foodReady',readyCtx)({id:1,push_token:'token'});
  assert.match(alerts.at(-1)[1], /ingen pushnotis/);
  const lock={current:false};
  await fn('loadOrders',{Alert,orderRefreshInProgress:lock,
    supabase:{from(){throw Error('network')}}})(true);
  assert.equal(lock.current,false);
  let inserts=0,resolveInsert;
  const submitCtx={Alert,orderSubmitInProgress:{current:false},menuAvailable:true,
    cart:[{name:'A'}],customerName:'Test',customerPhone:'123',orderDate:'2026-10-05',orderTime:'12:00',
    message:'',total:139,orderType:'Äta här',expoPushToken:'',
    supabase:{from:()=>({insert:()=>{inserts++;return new Promise(r=>resolveInsert=r)}})},
    setCart(){},setCustomerName(){},setCustomerPhone(){},setMessage(){},setOrderDate(){},setOrderTime(){},setShowCart(){}};
  const send=fn('sendOrder',submitCtx);const pending=send();await send();
  assert.equal(inserts,1);resolveInsert({error:null});await pending;
  assert.equal(submitCtx.orderSubmitInProgress.current,false);
  let available = true;
  const menuCtx = {Alert, menuRefreshInProgress:{current:false},menuLoadAlertShown:{current:false},
    menuSnapshot:{current:null},setMenuAvailable:v=>available=v,
    supabase:{from:()=>({select:()=>({order:async()=>({data:[],error:null})})})}};
  await fn('loadPublishedMenu',menuCtx)();assert.equal(available,false);
  assert.equal(menuCtx.menuRefreshInProgress.current,false);
  let rpcCalls = 0;
  const publishCtx={MENU:{Pasta:[]},menuPublishInProgress:{current:false},menuSnapshot:{current:[]},
    supabase:{rpc:async()=>{rpcCalls++;return {data:null,error:{message:'RPC not installed'}}}}};
  assert(await fn('publishMenuSection',publishCtx)('Pasta','',[['A',139]]));
  assert.equal(rpcCalls,1);assert.equal(publishCtx.menuPublishInProgress.current,false);
  assert(await fn('publishMenuSection',publishCtx)('Pasta','',[['A',0]]));
  assert.equal(rpcCalls,1);
  assert.equal(ast.program.body.some(n=>n.type==='ImportDeclaration' && n.source.value==='expo-audio'), false);
  assert(source.includes('onChangeText={setAdminPassword}'));
  const a=JSON.parse(fs.readFileSync('app.json'));const p=JSON.parse(fs.readFileSync('package.json'));
  assert.equal(a.expo.version,p.version);assert.equal(a.expo.version,'1.0.9');
  console.log('PASS: JSX syntax, auth failure/success, denied order update, push rejection, refresh unlock, duplicate tap, lazy audio, password field, runtime versions');

  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('test.uid',true),'')::uuid $$;
    create table public.menu_items(id bigint generated always as identity primary key,
      category text,day text,name text,price numeric,active boolean);
    insert into menu_items(category,day,name,price,active) values
      ('Pasta','','A',139,true),('Pasta','','B',139,true);
    alter table menu_items enable row level security;
    create policy read_menu on menu_items for select to authenticated using(true);
    create policy owner_update on menu_items for update to authenticated
      using(auth.uid()='11111111-1111-1111-1111-111111111111')
      with check(auth.uid()='11111111-1111-1111-1111-111111111111');
    create policy owner_insert on menu_items for insert to authenticated
      with check(auth.uid()='11111111-1111-1111-1111-111111111111');
    grant usage on schema public,auth to authenticated;
    grant select,insert,update on menu_items to authenticated;
    grant usage on sequence menu_items_id_seq to authenticated;`);
  await db.exec(fs.readFileSync('supabase/migrations/20261003_atomic_menu_publication.sql','utf8'));
  await db.exec(`set role authenticated;set test.uid='11111111-1111-1111-1111-111111111111';`);
  async function snapshot(){return (await db.query('select jsonb_agg(to_jsonb(m) order by id) as rows from menu_items m')).rows[0].rows;}
  async function publish(items,expected){return db.query(`select public.publish_menu_section_v1('Pasta','',$1::jsonb,$2::jsonb) as result`,[JSON.stringify(items),JSON.stringify(expected)]);}
  const before=await snapshot();
  const saved=await publish([{name:'C',price:145}],before);
  assert.equal(saved.rows[0].result[0].name,'C');assert.equal(saved.rows[0].result[1].active,false);
  await assert.rejects(()=>publish([{name:'stale',price:1}],before),/changed elsewhere/);
  await db.exec(`reset role;
    create function reject_failure() returns trigger language plpgsql as $$
      begin if NEW.name='FAIL' then raise exception 'injected failure'; end if;return NEW;end $$;
    create trigger fail_menu before insert or update on menu_items
      for each row execute function reject_failure();set role authenticated;`);
  const stable=await snapshot();
  await assert.rejects(()=>publish([{name:'changed',price:150},{name:'FAIL',price:150}],stable),/injected failure/);
  assert.deepEqual(await snapshot(),stable);
  await db.exec(`set test.uid='22222222-2222-2222-2222-222222222222';`);
  await assert.rejects(()=>publish([{name:'unauthorized',price:150}],stable),/denied/);
  assert.deepEqual(await snapshot(),stable);
  await db.exec(`reset role;set role anon;`);
  await assert.rejects(()=>publish([],stable),/permission denied/);
  await db.close();
  console.log('PASS: PostgreSQL function installs; publish/inactivate; stale save rejected; mid-save failure rolls back; non-owner RLS and anonymous execution denied');
}
checks().catch(e=>{console.error(e);process.exitCode=1});
