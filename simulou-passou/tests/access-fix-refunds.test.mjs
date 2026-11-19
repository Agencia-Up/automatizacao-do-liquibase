import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createCheckout} from '../cloud/checkout.mjs';
import {paidAccess} from '../cloud/access-policy.mjs';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',admin='33333333-3333-4333-8333-333333333333';
const order='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',renewal='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const migration=readFileSync(new URL('../cloud/access-refunds.sql',import.meta.url),'utf8');
async function fixture(t){
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema simulou_passou_private;grant usage on schema simulou_passou_private,public to service_role;
 create table simulou_passou_private.orders(id uuid primary key,user_id uuid,amount integer,status text,payment_id text,provider_state text,created_at timestamptz default now(),updated_at timestamptz default now(),prep_id text,provider_mode text,offer text,buyer_name text,access_expires_at timestamptz);
 create table simulou_passou_private.payment_events(event_id text primary key,order_id uuid,status text);
 create table simulou_passou_private.entitlements(user_id uuid,active boolean,source text,payment_id text,updated_at timestamptz default now());
 create table simulou_passou_private.administrators(user_id uuid primary key);
 create table simulou_passou_private.members(user_id uuid primary key,body jsonb);
 insert into simulou_passou_private.administrators values('${admin}');
 insert into simulou_passou_private.orders(id,user_id,amount,status,payment_id,prep_id,provider_mode,offer,access_expires_at) values
 ('${order}','${owner}',2990,'paid','checkout_first','pqo','production','module','2030-01-01'),
 ('${renewal}','${owner}',2990,'paid','checkout_second','ancord','production','module','2030-01-01');
 insert into simulou_passou_private.entitlements(user_id,active,source,payment_id) values('${owner}',true,'asaas','checkout_first');
 grant select,insert,update on all tables in schema simulou_passou_private to service_role;`);
 await db.exec(migration);
 const rpc=async(name,args)=>{
  await db.exec('set role service_role');
  try{return (await db.query('select public.'+name+'('+Object.keys(args).map((_,i)=>'$'+(i+1)).join(',')+') as result',Object.values(args))).rows[0].result;}
  finally{await db.exec('reset role');}
 };
 const status=async()=>(await db.query('select status,refunded_at from simulou_passou_private.orders where id=$1',[order])).rows[0];
 const access=async()=>paidAccess((await db.query('select user_id as "userId",amount,status,prep_id as "prepId",provider_mode as "providerMode",offer from simulou_passou_private.orders')).rows,'production',Date.parse('2026-11-19'));
 return {db,rpc,status,access};
}
test('pedido é do proprietário, não estorna por si e não expõe a cobrança a outro aluno',async t=>{
 const f=await fixture(t);
 await assert.rejects(f.rpc('sp_refund_request',{p_actor:other,p_order:order,p_mode:'production'}),e=>e.code==='PT404');
 await f.rpc('sp_refund_request',{p_actor:owner,p_order:order,p_mode:'production'});
 await f.rpc('sp_refund_request',{p_actor:owner,p_order:order,p_mode:'production'});
 assert.equal((await f.status()).status,'paid');assert.ok((await f.access()).modules.get(owner).has('pqo'));
 const mine=await f.rpc('sp_refund_orders',{p_actor:owner,p_mode:'production',p_admin:false,p_order:null});assert.equal(mine.length,2);assert.equal(mine[0].checkoutId,undefined);
 assert.deepEqual(await f.rpc('sp_refund_orders',{p_actor:other,p_mode:'production',p_admin:false,p_order:null}),[]);
 await assert.rejects(f.rpc('sp_refund_orders',{p_actor:other,p_mode:'production',p_admin:true,p_order:null}),e=>e.code==='PT403');
 const queue=await f.rpc('sp_refund_orders',{p_actor:admin,p_mode:'production',p_admin:true,p_order:null});assert.equal(queue.length,1);assert.equal(queue[0].checkoutId,'checkout_first');
});
test('Asaas confirmado revoga o módulo mesmo com sessão aberta; evento atrasado não restaura e outra compra permanece',async t=>{
 const f=await fixture(t);let paymentStatus='REFUND_IN_PROGRESS';
 const token='w'.repeat(40),events=[];
 const checkout=createCheckout({config:{mode:'production',apiKey:'synthetic-asaas',webhookToken:token},origin:'https://logosiabrasil.com',basePath:'/simulou-passou',fault:(status,message)=>Object.assign(new Error(message),{status}),
  rpc:async(name,args)=>{events.push({name,args});if(name==='sp_checkout_known')return true;return f.rpc(name,args);},
  fetchImpl:async()=>new Response(JSON.stringify({id:'pay_first',checkoutSession:'checkout_first',billingType:'PIX',status:paymentStatus,value:29.90}))});
 const notify=(id,event='PAYMENT_REFUNDED')=>checkout.handleWebhook(new Request('https://example.test',{headers:{'asaas-access-token':token}}),{id,event,payment:{id:'pay_first',checkoutSession:'checkout_first'}});
 await notify('in_progress');assert.equal((await f.status()).status,'paid');
 paymentStatus='REFUNDED';await notify('refund_confirmed');await notify('refund_confirmed');
 assert.equal((await f.status()).status,'refunded');assert.ok((await f.status()).refunded_at);
 assert.equal((await f.db.query('select active from simulou_passou_private.entitlements')).rows[0].active,false);
 let access=await f.access();assert.equal(access.modules.get(owner).has('pqo'),false);assert.equal(access.modules.get(owner).has('ancord'),true);
 paymentStatus='RECEIVED';await notify('late_paid','PAYMENT_RECEIVED');assert.equal((await f.status()).status,'refunded');
 await assert.rejects(checkout.handleWebhook(new Request('https://example.test'),{id:'forged',event:'PAYMENT_REFUNDED',payment:{id:'pay_first'}}),e=>e.status===403);
 assert.equal(events.find(e=>e.args?.p_event==='refund_confirmed').args.p_state,'refunded_final');
});
test('cancelar checkout pago não revoga; valores e eventos inválidos não mudam o pedido',async t=>{
 const f=await fixture(t),base={p_provider:'checkout_first',p_mode:'production',p_event:'cancel_paid',p_state:'cancelled',p_amount:null};
 await f.rpc('sp_checkout_event',base);assert.equal((await f.status()).status,'paid');
 await assert.rejects(f.rpc('sp_checkout_event',{...base,p_event:'wrong_amount',p_state:'refunded_final',p_amount:299}),e=>e.code==='22023');
 await assert.rejects(f.rpc('sp_checkout_event',{...base,p_event:'missing_state',p_state:null}),e=>e.code==='22023');
 assert.equal((await f.status()).status,'paid');
});
test('migração é repetível; limitador permite cliente ausente e recusa repetição; funções privadas não são chamadas pelo navegador',async t=>{
 const f=await fixture(t);await f.db.exec(migration);
 await f.rpc('sp_mail_reserve',{p_recipient:'a'.repeat(64),p_client:null});
 await assert.rejects(f.rpc('sp_mail_reserve',{p_recipient:'a'.repeat(64),p_client:null}),e=>e.code==='PT429');
 for(const role of ['anon','authenticated']){
  await f.db.exec('set role '+role);
  await assert.rejects(f.db.query('select public.sp_refund_orders($1,$2,false,null)',[owner,'production']),/permission denied/);
  await assert.rejects(f.db.query('select public.sp_mail_reserve($1,null)',['b'.repeat(64)]),/permission denied/);
  await f.db.exec('reset role');
 }
});
