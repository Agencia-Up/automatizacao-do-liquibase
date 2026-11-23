import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createProductAuth} from '../cloud/product-auth.mjs';
import {createCloudGateway} from '../cloud/gateway.mjs';
import {signAuthLink,openAuthLink,sealProductCookie,openProductCookie} from '../cloud/auth-links.mjs';
import {createAccountMail,createRegistrationMail,createPurchaseMail,createMailAudit,createAccountMailStatus} from '../cloud/branded-mail.mjs';
import {sealPurchaseMessage} from '../cloud/purchase-snapshot.mjs';
const site='https://logosiabrasil.com',baseUrl=site+'/simulou-passou',serviceKey='synthetic-test-service';
const legacyId='11111111-1111-4111-8111-111111111111',productId='22222222-2222-4222-8222-222222222222';
const email='student@example.test',alias='sp-'+productId+'@simulou-passou.invalid',rawToken='r'.repeat(64);
const fault=(status,message)=>Object.assign(new Error(message),{status});
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
const options={baseUrl,serviceKey,purpose:'recovery',token:rawToken};

test('links e cookies funcionam sem Buffer global, como no worker de produção',()=>{
  const previous=globalThis.Buffer;
  try{
    globalThis.Buffer=undefined;
    const link=signAuthLink(options);assert.equal(openAuthLink(link,options),rawToken);
    const cookieOptions={name:'sp_product_access',path:'/simulou-passou/api',serviceKey};
    assert.equal(openProductCookie(sealProductCookie('synthetic-session',cookieOptions),cookieOptions),'synthetic-session');
  }finally{globalThis.Buffer=previous;}
});

test('diagnóstico de envio exige credencial de serviço e consulta somente metadados da mensagem correta',async()=>{
  const gateway=createCloudGateway({supabaseUrl:'https://db.example.test',serviceKey,publishableKey:'synthetic-public',allowedOrigins:[site],resendKey:'synthetic-mail',fetchImpl:()=>{throw Error('Unexpected request');}});
  const result=await gateway(new Request(baseUrl+'/api/internal/account-mail',{method:'POST',headers:{Origin:site},body:JSON.stringify({action:'recover',email})}));assert.equal(result.status,403);
  const status=createAccountMailStatus({resendKey:'synthetic-mail',fetchImpl:async()=>response({id:'message-one',to:[email],from:'Simulou Passou <simuloupassou@logosiabrasil.com>',subject:'Simulou Passou · Defina sua senha',last_event:'delivered',html:'must-not-leak'})});
  const delivered=await status({id:'message-one',email});assert.equal(delivered.status,'delivered');assert.equal(delivered.recipientMatches,true);assert.equal(delivered.html,undefined);
  assert.equal((await status({id:'message-one',email:'other@example.test'})).error,'product_message_mismatch');
});

test('links são exclusivos do produto, finalidade e domínio; rejeitam adulteração, expiração e chaves antigas',()=>{
  const link=signAuthLink({...options,now:1000000});
  assert.equal(openAuthLink(link,{...options,now:1000000}),rawToken);
  assert.ok(!Buffer.from(link.split('.')[1],'base64url').toString('utf8').includes(rawToken));
  for(const change of [{baseUrl:site+'/outro'},{purpose:'signup'},{serviceKey:'other-secret'},{now:4600000}])
    assert.throws(()=>openAuthLink(link,{...options,now:1000000,...change}));
  assert.throws(()=>openAuthLink(rawToken,options));
  const parts=link.split('.');parts[1]=Buffer.from(JSON.stringify({aud:'logos',purpose:'recovery',token:rawToken,baseUrl,exp:4600})).toString('base64url');
  assert.throws(()=>openAuthLink(parts.join('.'),{...options,now:1000000}));
});

test('cadastro e recuperação enviam a marca e endereço próprios ao e-mail real, sem redirecionamento geral da Logos',async()=>{
  const messages=[],generated=[];
  const args={baseUrl,serviceKey,resendKey:'synthetic-mail',fault,
    supa:async(path,request)=>{generated.push(request.body);return {hashed_token:rawToken,action_link:'https://logosiabrasil.com/auth'};},
    fetchImpl:async(url,request)=>{messages.push(JSON.parse(request.body));return response({id:'message-one'});}};
  await createAccountMail(args)({email,authEmail:alias});
  await createRegistrationMail(args)({email,authEmail:alias,name:'Aluno',password:'only-a-test-password'});
  assert.deepEqual(generated.map(x=>x.email),[alias,alias]);
  for(const mail of messages){
    assert.equal(mail.from,'Simulou Passou <simuloupassou@logosiabrasil.com>');assert.deepEqual(mail.to,[email]);
    assert.match(mail.subject,/Simulou Passou/);assert.ok(mail.tags.some(t=>t.name==='project'&&t.value==='simulou-passou'));
    assert.ok(!mail.html.includes(alias));assert.ok(!mail.html.includes('https://logosiabrasil.com/auth'));
  }
  assert.match(messages[0].html,/#\/redefinir\?chave=sp1\./);
  assert.match(messages[1].html,/#\/confirmar\?chave=sp1\./);
});

test('sem remetente configurado não envia o modelo padrão do Auth; callback de outro app não abre sessão',async()=>{
  const calls=[];const gateway=createCloudGateway({supabaseUrl:'https://db.example.test',serviceKey,publishableKey:'synthetic-public',allowedOrigins:[site],
    fetchImpl:async(url)=>{calls.push(url);throw Error('Unexpected external call');}});
  for(const [path,body,status] of [['recover',{email},503],['callback',{access_token:'logos-access',refresh_token:'logos-refresh'},401]]){
    const result=await gateway(new Request(baseUrl+'/api/auth/'+path,{method:'POST',headers:{Origin:site},body:JSON.stringify(body)}));
    assert.equal(result.status,status);assert.equal(result.headers.get('set-cookie'),null);
  }
  assert.equal(calls.length,0);
});

function productFixture(){
  let exists=false,productPassword=null,logosPassword='old-logos-password';const calls=[];
  const account=()=>({email,authEmail:alias,authUserId:productId,memberId:legacyId,legacy:true,exists,confirmed:exists,name:'Aluno'});
  const rpc=async(name,args)=>{calls.push({name,args});assert.equal(name,'sp_product_identity');
    if(args.p_auth_user)return args.p_auth_user===productId&&exists?account():null;
    return args.p_create||exists?account():{email,memberId:legacyId,legacy:true,exists:false};};
  const supa=async(path,request={})=>{
    calls.push({path,...request});const b=request.body||{};
    if(path==='/auth/v1/admin/users'){assert.equal(b.email,alias);assert.equal(b.id,productId);productPassword=b.password;exists=true;return {id:productId};}
    if(path.startsWith('/auth/v1/token')){
      const legacy=b.email===email;assert.equal(b.password,legacy?logosPassword:productPassword);
      return {user:{id:legacy?legacyId:productId,email:legacy?email:alias,user_metadata:{name:'Aluno'}},access_token:legacy?'logos-validation':'product-access',refresh_token:'product-refresh'};
    }
    if(path==='/auth/v1/logout?scope=local')return {};
    throw Error('Unexpected call '+path);
  };
  return {rpc,supa,calls,auth:createProductAuth({rpc,supa,publishableKey:'synthetic-public',fault}),
    setProductPassword:value=>{productPassword=value;},get logosPassword(){return logosPassword;}};
}
test('primeiro login mantém dados e depois usa senha independente, sem escrever na conta Logos',async()=>{
  const f=productFixture();const first=await f.auth.login(email,'old-logos-password');assert.equal(first.user.id,productId);
  const resolved=await f.auth.resolve(first.user);assert.equal(resolved.id,legacyId);assert.equal(resolved.email,email);
  assert.ok(f.calls.some(c=>c.path==='/auth/v1/logout?scope=local'&&c.token==='logos-validation'));
  f.setProductPassword('new-simulator-password');
  const start=f.calls.length;assert.equal((await f.auth.login(email,'new-simulator-password')).user.id,productId);
  assert.equal(f.logosPassword,'old-logos-password');
  assert.equal(f.calls.slice(start).filter(c=>c.path?.startsWith('/auth/v1/token')&&c.body.email===email).length,0);
  assert.equal(f.calls.filter(c=>c.method==='PUT').length,0);
  assert.equal(await f.auth.resolve({id:legacyId,email}),null);
});
test('recuperação cria apenas identidade própria; não altera nem pede recuperação da conta Logos',async()=>{
  const f=productFixture();const account=await f.auth.recovery(email);assert.equal(account.authEmail,alias);assert.equal(f.logosPassword,'old-logos-password');
  assert.equal(f.calls.filter(c=>c.path?.startsWith('/auth/v1/token')).length,0);
  assert.equal(f.calls.filter(c=>c.path==='/auth/v1/admin/users').length,1);
  await f.auth.recovery(email);assert.equal(f.calls.filter(c=>c.path==='/auth/v1/admin/users').length,1);
});

test('gateway recusa JWT Logos, troca somente senha do produto e conserva refresh token rotacionado',async()=>{
  const f=productFixture();await f.auth.login(email,'old-logos-password');const writes=[],actors=[];
  const productUser={id:productId,email:alias,user_metadata:{name:'Aluno'}};
  const gateway=createCloudGateway({supabaseUrl:'https://db.example.test',serviceKey,publishableKey:'synthetic-public',allowedOrigins:[site],resendKey:'synthetic-mail',
    fetchImpl:async(url,request)=>{
      const path=new URL(url).pathname,body=request.body?JSON.parse(request.body):{},token=request.headers.Authorization.slice(7);
      if(path==='/rest/v1/rpc/sp_product_identity')return response(await f.rpc('sp_product_identity',body));
      if(path==='/rest/v1/rpc/sp_feedback_submit'){actors.push(body.p_actor);return response(null);}
      if(path==='/auth/v1/user'){
        if(request.method==='PUT'){writes.push({token,password:body.password});return response(productUser);}
        if(token==='expired')return response({},401);
        return response(token==='logos-access'?{id:legacyId,email}:productUser);
      }
      if(path==='/auth/v1/verify')return response({user:productUser,access_token:'product-reset'});
      if(path==='/auth/v1/logout')return response({});
      if(path==='/auth/v1/token'&&body.refresh_token)return response({user:productUser,access_token:'rotated-access',refresh_token:'rotated-refresh',expires_in:1234});
      throw Error('Unexpected call '+path);
    }});
  const request=async(path,body,cookie)=>gateway(new Request(baseUrl+'/api'+path,{method:'POST',headers:{Origin:site,Cookie:cookie||''},body:JSON.stringify(body)}));
  const cookie=(name,value)=>name+'='+sealProductCookie(value,{name,path:'/simulou-passou/api',serviceKey});
  assert.equal((await request('/feedback',{message:'Minha opinião'},cookie('sp_product_access','logos-access'))).status,401);
  const result=await request('/feedback',{message:'Minha opinião'},cookie('sp_product_access','expired')+'; '+cookie('sp_product_refresh','old-refresh'));
  assert.equal(result.status,201);assert.deepEqual(actors,[legacyId]);
  const refreshed=result.headers.get('set-cookie').match(/sp_product_refresh=([^;]+)/)[1];
  assert.equal(openProductCookie(refreshed,{name:'sp_product_refresh',path:'/simulou-passou/api',serviceKey}),'rotated-refresh');
  assert.ok(!result.headers.get('set-cookie').includes('rotated-access'));
  assert.throws(()=>openProductCookie(refreshed,{name:'sp_product_access',path:'/simulou-passou/api',serviceKey}));
  assert.match(result.headers.get('set-cookie'),/Max-Age=1234/);
  const reset=await request('/auth/reset',{password:'new-product-password',recoveryKey:signAuthLink(options)});
  assert.equal(reset.status,200);assert.deepEqual(writes,[{token:'product-reset',password:'new-product-password'}]);
  assert.equal(f.logosPassword,'old-logos-password');
  const raw=await request('/auth/reset',{password:'bad-password',recoveryKey:rawToken});assert.equal(raw.status,400);
});

test('compra gera acesso na identidade interna e envia somente ao endereço real',async()=>{
  const order={id:'test-order',token:'test-claim',generation:1,email,offer:'module',module:'PQO Operações',amount:2990,expiresAt:'2027-11-23T12:00:00Z'};
  const generated=[],sent=[],records=[];let cipher;
  const send=createPurchaseMail({baseUrl,serviceKey,resendKey:'synthetic-mail',
    purchaseAccess:async()=>({email,authEmail:alias,name:'Aluno',password:null}),
    supa:async(path,request)=>{generated.push(request.body.email);return {hashed_token:rawToken};},
    rpc:async(name,args)=>{records.push(name);if(name==='sp_purchase_mail_snapshot')return cipher=args.p_cipher;},
    fetchImpl:async(url,request)=>{sent.push(JSON.parse(request.body));return response({id:'purchase-message'});}});
  assert.equal(await send(order),null);assert.deepEqual(generated,[alias]);assert.deepEqual(sent[0].to,[email]);
  assert.equal(sent[0].from,'Simulou Passou <simuloupassou@logosiabrasil.com>');assert.ok(!sent[0].html.includes(alias));
  assert.ok(records.includes('sp_purchase_combined_record'));
  assert.equal(await send({...order,contentCipher:cipher}),null);assert.equal(generated.length,1);
});

test('auditoria lê apenas IDs registrados no pedido e rejeita mensagem Logos para o mesmo destinatário',async()=>{
  for(const wrong of [false,true]){
    const reads=[],records=[];
    const audit=createMailAudit({resendKey:'synthetic-mail',rpc:async(name,args)=>{
      if(name==='sp_purchase_mail_audit')return {email,messageId:'sp-message'};
      records.push(args);
    },fetchImpl:async url=>{reads.push(url);return response({id:'sp-message',to:[email],from:wrong?'Logosai <suporte@logosiabrasil.com>':'Simulou Passou <simuloupassou@logosiabrasil.com>',subject:wrong?'Recuperação de senha - LogosIA':'Compra confirmada · Simulou Passou',last_event:'delivered'});}});
    const result=await audit('test-order');assert.deepEqual(reads,['https://api.resend.com/emails/sp-message']);
    if(wrong){assert.equal(result.error,'product_message_mismatch');assert.equal(records.length,0);}else{assert.equal(records.length,1);assert.equal(result.emails[0].status,'delivered');}
  }
});
test('reenvio de compra recusa envelope de outro destinatário ou links de outro produto',async()=>{
  const order={id:'test-order',generation:1,email};let sent=0;
  for(const mutation of [{to:['another@example.test']},{html:'<a href="https://logosiabrasil.com/auth">Entrar</a>'}]){
    const content={from:'Simulou Passou <simuloupassou@logosiabrasil.com>',to:[email],subject:'Compra · Simulou Passou',tags:[{name:'project',value:'simulou-passou'}],html:'<a href="'+baseUrl+'/#/entrar">Entrar</a>',...mutation};
    const send=createPurchaseMail({baseUrl,serviceKey,resendKey:'synthetic-mail',fetchImpl:async()=>{sent++;return response({id:'mail'});}});
    assert.equal(await send({...order,contentCipher:sealPurchaseMessage(content,order,serviceKey)}),'purchase_access_or_mail_failed');
  }
  assert.equal(sent,0);
});

async function database(t){
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create schema simulou_passou_private;
    create table auth.users(id uuid primary key,email text unique,deleted_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',email_confirmed_at timestamptz,encrypted_password text);
    create table public.profiles(id uuid primary key);
    create table public.user_subscriptions(user_id uuid primary key);
    create function public.handle_new_user() returns trigger language plpgsql security definer as $f$
BEGIN
      insert into public.profiles values(NEW.id); RETURN NEW;
END;$f$;
    create function public.create_default_subscription() returns trigger language plpgsql security definer as $f$
BEGIN
      insert into public.user_subscriptions values(NEW.id); RETURN NEW;
END;$f$;
    create trigger profile_created after insert on auth.users for each row execute function public.handle_new_user();
    create trigger subscription_created after insert on auth.users for each row execute function public.create_default_subscription();
    create table simulou_passou_private.members(user_id uuid primary key,body jsonb);
    create table simulou_passou_private.administrators(user_id uuid primary key);
    create table simulou_passou_private.orders(id uuid primary key,user_id uuid,status text,buyer_email text,buyer_name text);
    create table simulou_passou_private.purchase_mail(order_id uuid primary key,claim_token uuid,sent_at timestamptz);
    create table simulou_passou_private.purchase_accounts(email text primary key,user_id uuid unique,first_order uuid,initial_hash text);
    create function public.sp_purchase_mail_claim(p_mode text) returns jsonb language sql as $f$select jsonb_agg(jsonb_build_object('email',o.buyer_email)) from simulou_passou_private.orders o;$f$;
    create function public.sp_purchase_mail_audit(p_order uuid) returns jsonb language sql as $f$select jsonb_build_object('email',o.buyer_email) from simulou_passou_private.orders o where o.id=p_order;$f$;
    insert into auth.users(id,email,encrypted_password,email_confirmed_at) values('${legacyId}','${email}','original-logos-hash',now());
    insert into simulou_passou_private.members values('${legacyId}','{"notes":[{"body":"Preservar"}]}');
    insert into simulou_passou_private.administrators values('${legacyId}');
    grant usage on schema public,simulou_passou_private to service_role;
  `);
  const migration=readFileSync(new URL('../cloud/product-isolation.sql',import.meta.url),'utf8');
  await db.exec(migration);await db.exec(migration);
  const rpc=async(email=null,id=null,create=false)=>(await db.query('select public.sp_product_identity($1,$2,$3) result',[email,id,create])).rows[0].result;
  return {db,rpc};
}
test('registro privado conserva tentativas e administrador; novas identidades não ganham perfil ou assinatura Logos',async t=>{
  const f=await database(t),first=await f.rpc(email,null,true),again=await f.rpc(email.toUpperCase(),null,true);
  assert.equal(first.authUserId,again.authUserId);assert.notEqual(first.authUserId,legacyId);assert.equal(first.memberId,legacyId);
  assert.equal(await f.rpc(null,legacyId),null);
  await f.db.query('insert into auth.users(id,email,encrypted_password) values($1,$2,$3)',[first.authUserId,first.authEmail,'new-product-hash']);
  assert.equal((await f.db.query('select count(*)::int n from public.profiles')).rows[0].n,1);
  assert.equal((await f.db.query('select count(*)::int n from public.user_subscriptions')).rows[0].n,1);
  assert.equal((await f.db.query('select encrypted_password from auth.users where id=$1',[legacyId])).rows[0].encrypted_password,'original-logos-hash');
  assert.equal((await f.db.query('select body from simulou_passou_private.members where user_id=$1',[legacyId])).rows[0].body.notes[0].body,'Preservar');
  await f.db.query("insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'logos-only@example.test','{\"product_origin\":\"simulou-passou\"}')");
  assert.equal((await f.db.query('select count(*)::int n from public.profiles')).rows[0].n,2);
  assert.equal(await f.rpc('logos-only@example.test'),null);
  assert.equal((await f.rpc(null,first.authUserId)).exists,true);
});
test('identidades e RPCs não são acessíveis por anon ou authenticated; compra vincula o aluno correto sem misturar Auth',async t=>{
  const f=await database(t);
  for(const role of ['anon','authenticated']){
    const privileges=(await f.db.query(`select has_function_privilege('${role}','public.sp_product_identity(text,uuid,boolean)','execute') exec,has_table_privilege('${role}','simulou_passou_private.product_identities','select') read`)).rows[0];
    assert.deepEqual(privileges,{exec:false,read:false});
  }
  const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',claim='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await f.db.query("insert into simulou_passou_private.orders values($1,null,'paid',$2,'Aluno')",[id,email]);
  await f.db.query('insert into simulou_passou_private.purchase_mail values($1,$2,null)',[id,claim]);
  const purchase=async()=>(await f.db.query('select simulou_passou_private.purchase_identity($1,$2) result',[id,claim])).rows[0].result;
  const account=await purchase();assert.equal(account.email,email);assert.notEqual(account.authEmail,email);assert.equal(account.memberId,legacyId);assert.equal(account.create,true);
  await f.db.query('insert into auth.users(id,email,encrypted_password,email_confirmed_at) values($1,$2,$3,now())',[account.authUserId,account.authEmail,'product-hash']);
  assert.equal((await purchase()).create,false);
  assert.equal((await f.db.query('select user_id from simulou_passou_private.orders where id=$1',[id])).rows[0].user_id,legacyId);
  await f.db.query('update simulou_passou_private.orders set buyer_email=null where id=$1',[id]);
  assert.equal((await purchase()).email,email);
  assert.equal((await f.db.query("select public.sp_purchase_mail_claim('production') result")).rows[0].result[0].email,email);
  assert.equal((await f.db.query('select public.sp_purchase_mail_audit($1) result',[id])).rows[0].result.email,email);
  assert.equal((await f.db.query('select count(*)::int n from public.profiles')).rows[0].n,1);
});
