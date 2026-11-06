import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCloudGateway} from '../cloud/gateway.mjs';
import {seed} from '../seed.mjs';
const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',admin:'33333333-3333-4333-8333-333333333333'};
const site='https://logosiabrasil.com';
function fixture(){
  const source=seed(),catalog={revision:1,body:Object.fromEntries(['preparations','materials','questions','quizzes'].map(k=>[k,source[k]]))};
  const members=new Map(),active=new Set(),orders=[],calls=[];let conflict=false,commits=0;
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  const fetchImpl=async(url,options)=>{
    const u=new URL(url),token=options.headers.Authorization?.slice(7),key=Object.keys(ids).find(k=>'token-'+k===token);
    const body=options.body?JSON.parse(options.body):{};calls.push({path:u.pathname,body,key:options.headers.apikey,token});
    const user=k=>({id:ids[k],email:k+'@example.test',created_at:'2026-01-01T00:00:00Z',user_metadata:{name:k,role:'master'}});
    if(u.pathname==='/auth/v1/user')return key?response(user(key)):response({code:'bad_jwt'},401);
    if(u.pathname==='/auth/v1/token')return body.password==='valid-password'?response({user:user('a'),access_token:'token-a',refresh_token:'refresh-a',expires_in:3600}):response({},400);
    if(u.pathname==='/auth/v1/signup')return response({user:user('a')});
    if(u.pathname==='/auth/v1/recover'||u.pathname==='/auth/v1/logout')return response({});
    if(u.pathname==='/rest/v1/rpc/sp_runtime_load'){
      const actor=body.p_actor,admin=actor===ids.admin;
      return response({admin,entitled:admin||active.has(actor),catalog,orders:orders.filter(o=>admin||o.userId===actor),members:[...members.values()].filter(r=>admin||r.user_id===actor),active_users:[...active]});
    }
    if(u.pathname==='/rest/v1/rpc/sp_runtime_commit'){
      if(conflict){conflict=false;const record=members.get(body.p_actor);record.revision++;record.body.notes.push({id:'other-tab',userId:body.p_actor,title:'Outra aba',body:'Preservar'});return response({code:'40001'},409);}
      for(const r of body.p_members){const prior=members.get(r.user_id);if((prior?.revision||0)!==r.revision)return response({code:'40001'},409);}
      for(const r of body.p_members)members.set(r.user_id,{...structuredClone(r),revision:r.revision+1});
      if(body.p_catalog){catalog.body=body.p_catalog;catalog.revision++;}
      commits++;return response(null);
    }
    if(u.pathname==='/rest/v1/rpc/sp_module_access'){if(body.p_active)active.add(body.p_user);else active.delete(body.p_user);return response(null);}
    throw new Error('Unexpected service call '+u.pathname);
  };
  const gateway=createCloudGateway({supabaseUrl:'https://db.example.test',serviceKey:'server-only-test-secret',publishableKey:'publishable-test',allowedOrigins:[site],fetchImpl});
  const request=async(path,method='GET',body,account='a',extra={})=>{
    const res=await gateway(new Request('https://db.example.test/functions/v1/simulou-passou-api/api'+path,{method,headers:{...(account?{cookie:'sp_access=token-'+account}:{}),origin:site,...extra},body:body===undefined?undefined:JSON.stringify(body)}));
    return {status:res.status,headers:res.headers,data:await res.json()};
  };
  return {request,members,active,orders,calls,get commits(){return commits;},conflict(){conflict=true;}};
}
test('produção não expõe gabaritos, atalhos de demonstração ou pagamento falso',async()=>{
  const f=fixture(),r=await f.request('/bootstrap','GET',undefined,null);
  assert.equal(r.status,200);assert.equal(r.data.local,false);assert.equal(r.data.checkoutEnabled,false);
  assert.ok(!JSON.stringify(r.data).includes('server-only-test-secret'));assert.ok(!JSON.stringify(r.data).includes('correct'));
  assert.equal(r.data.materials.some(m=>'body'in m),false);
  assert.equal((await f.request('/auth/demo','POST',{role:'master'})).status,404);
  assert.equal((await f.request('/orders/x/demo-event','POST',{status:'paid'})).status,404);
  assert.equal((await f.request('/orders','POST',{})).status,503);
  assert.equal((await f.request('/materials/m1','GET',undefined,null)).status,401);
});
test('login usa cookies HttpOnly/Secure e recuperação não devolve token',async()=>{
  const f=fixture();const login=await f.request('/auth/login','POST',{email:'a@example.test',password:'valid-password'},null);
  assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);assert.match(login.headers.get('set-cookie'),/Path=\/simulou-passou\/api/);
  assert.deepEqual(login.data,{ok:true});
  const registered=await f.request('/auth/register','POST',{name:'Pessoa',email:'a@example.test',password:'valid-password'},null);
  assert.equal(registered.data.confirmationRequired,true);
  const recovery=await f.request('/auth/recover','POST',{email:'a@example.test'},null);
  assert.equal(recovery.status,200);assert.equal(recovery.data.resetPath,undefined);assert.ok(!JSON.stringify(recovery.data).includes('token'));
  assert.equal((await f.request('/auth/login','POST',{email:'a@example.test',password:'wrong'},null)).status,401);
});
test('papel editável no perfil não concede administração e notas ficam por conta',async()=>{
  const f=fixture();await f.request('/bootstrap');
  assert.equal((await f.request('/admin')).status,403);
  const note=await f.request('/workspace/notes','POST',{body:'Minha nota',title:'Privada',userId:ids.b});
  assert.equal(note.data.userId,ids.a);assert.equal(f.members.get(ids.a).body.notes.length,1);
  assert.equal((await f.request('/workspace','GET',undefined,'b')).data.notes.length,0);
  assert.equal((await f.request('/workspace/notes/'+note.data.id,'DELETE',{},'b')).status,404);
  const before=f.commits;await f.request('/workspace');assert.equal(f.commits,before);
});
test('acesso pago revogado não é recuperado por status antigo de pedido',async()=>{
  const f=fixture();f.orders.push({id:'old',userId:ids.a,status:'paid',amount:2990});
  assert.equal((await f.request('/attempts','POST',{quizId:'s1'})).status,403);
  f.active.add(ids.a);const started=await f.request('/attempts','POST',{quizId:'s1'});
  assert.equal(started.status,200);assert.equal(started.data.questions.some(q=>'correct'in q),false);
  assert.equal((await f.request('/attempts/'+started.data.id,'GET',undefined,'b')).status,403);
  const finished=await f.request('/attempts/'+started.data.id+'/finish','POST',{});
  assert.equal(finished.status,200);assert.ok('correct'in finished.data.questions[0]);
  f.active.delete(ids.a);assert.equal((await f.request('/materials/m1')).status,403);
});
test('conflito entre abas é repetido com estado novo, sem perder notas',async()=>{
  const f=fixture();await f.request('/workspace/notes','POST',{body:'Nota inicial'});
  f.conflict();const r=await f.request('/workspace/notes','POST',{body:'Nota nova'});
  assert.equal(r.status,200);const notes=(await f.request('/workspace')).data.notes;
  assert.equal(notes.length,3);assert.ok(notes.some(n=>n.body==='Preservar'));assert.equal(notes.filter(n=>n.body==='Nota nova').length,1);
});
test('origem e JWT inválidos não são aceitos como identidade',async()=>{
  const f=fixture();assert.equal((await f.request('/workspace/notes','POST',{body:'Ataque'},'a',{origin:'https://evil.example'})).status,403);
  assert.equal((await f.request('/workspace','GET',undefined,'a',{cookie:'sp_access=forged'})).status,401);
  assert.equal((await f.request('/auth/callback','POST',{access_token:'forged',refresh_token:'forged'},null)).status,401);
  assert.equal((await f.request('/admin/access/'+ids.b,'PATCH',{active:true})).status,403);
});
