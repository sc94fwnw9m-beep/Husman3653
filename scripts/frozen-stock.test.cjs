const fs=require('node:fs');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.is_restaurant_admin() returns boolean language sql as $$select coalesce(current_setting('test.owner',true),'')='yes'$$;
 create table menu_items(id bigint generated always as identity primary key, category text, day text, name text, price numeric,active boolean);
 create table orders(id bigint generated always as identity primary key,items jsonb,status text);
 grant usage on schema public,auth to anon,authenticated;
 grant select,insert,update on menu_items to authenticated;
 grant insert,select on orders to anon,authenticated;
 grant usage on all sequences in schema public to anon,authenticated;`);
 await db.exec(fs.readFileSync('supabase/migrations/20261003_atomic_menu_publication.sql','utf8'));
 const migration=fs.readFileSync('supabase/migrations/20261102_frozen_stock.sql','utf8');
 await db.exec(migration);await db.exec(migration);
 assert.equal((await db.query('select * from frozen_meal_stock')).rows.length,0);
 const menu=[{name:'Kalops',price:65},{name:'Kyckling',price:65}];
 const save=(items,expected,stock,expectedStock)=>db.query('select publish_frozen_menu_v1($1,$2,$3,$4) saved',[JSON.stringify(items),JSON.stringify(expected),JSON.stringify(stock),JSON.stringify(expectedStock)]);
 await db.exec("set role authenticated; set test.uid='11111111-1111-1111-1111-111111111111';set test.owner='no'");
 await assert.rejects(()=>save(menu,[],{Kalops:3,Kyckling:3},{}),/owner authorization/);
 await db.exec("set test.owner='yes'");
 const saved=(await save(menu,[],{Kalops:3,Kyckling:3},{})).rows[0].saved;
 await assert.rejects(()=>save(menu,saved,{Kalops:-1,Kyckling:3},{Kalops:3,Kyckling:3}),/Invalid frozen stock/);
 await db.exec('reset role; set role anon');
 await assert.rejects(()=>db.exec("update frozen_meal_stock set quantity=100"),/permission denied/);
 const bundle=(items,pack=5,qty=1)=>({category:'Frysta matlådor',qty,price:pack===1?65:pack===5?290:550,frozenPack:pack,frozenItems:items});
 const insert=items=>db.query('insert into orders(items) values($1)',[JSON.stringify(items)]);
 // Mixed package consumes exactly requested counts.
 await insert([bundle([{name:'Kalops',qty:2},{name:'Kyckling',qty:3}])]);
 assert.deepEqual((await db.query('select name,quantity from frozen_meal_stock order by name')).rows,[{name:'Kalops',quantity:1},{name:'Kyckling',quantity:0}]);
 // Insufficient mixed order rolls back all stock updates and order creation.
 await assert.rejects(()=>insert([bundle([{name:'Kalops',qty:1}],1),bundle([{name:'Kyckling',qty:1}],1)]),/FROZEN_STOCK/);
 assert.equal((await db.query("select quantity from frozen_meal_stock where name='Kalops'")).rows[0].quantity,1);
 // Two buyers of the last box: only one transaction succeeds.
 const results=await Promise.allSettled([insert([bundle([{name:'Kalops',qty:1}],1)]),insert([bundle([{name:'Kalops',qty:1}],1)])]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await db.query("select quantity from frozen_meal_stock where name='Kalops'")).rows[0].quantity,0);
 await assert.rejects(()=>insert([{category:'Frysta matlådor',qty:1,price:65}]),/FROZEN_STOCK/);
 await db.exec("reset role;set role authenticated;set test.owner='yes'");
 await assert.rejects(()=>save(menu,saved,{Kalops:8,Kyckling:8},{Kalops:3,Kyckling:3}),/Stock changed/);
 await save(menu,saved,{Kalops:8,Kyckling:8},{Kalops:0,Kyckling:0});
 await db.exec('reset role;set role anon');
 await insert([bundle([{name:'Kalops',qty:1}],1,3)]);
 assert.equal((await db.query("select quantity from frozen_meal_stock where name='Kalops'")).rows[0].quantity,5);
 await insert([{category:'Lunch',qty:1,price:139,name:'Vanlig lunch'}]);
 await db.close();console.log('PASS stock: owner-only save, public read, no fabricated stock, exact mixed quantities, last-box race, all-or-nothing order, stale owner write rejected, multipack deduction, ordinary orders preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
