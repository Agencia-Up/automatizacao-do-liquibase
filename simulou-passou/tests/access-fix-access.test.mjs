import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCloudGateway} from '../cloud/gateway.mjs';
import {signAuthLink} from '../cloud/auth-links.mjs';
import {cloudAuthPage,cloudAccount} from '../public/cloud-ui.js';
const site='https://logosiabrasil.com',uid='11111111-1111-4111-8111-111111111111',rawKey='r'.repeat(64),key=signAuthLink({token:rawKey,purpose:'recovery',baseUrl:site+'/simulou-passou',serviceKey:'synthetic-service'});
function fixture(options={}){
 const calls=[];let verified=0,updated=0,sent=0;
 const response=(v,status=200)=>new Response(JSON.stringify(v),{status});
 const user={id:uid,email:'student@example.test',email_confirmed_at:'2026-01-01',user_metadata:{name:'Aluno'}};
 const gateway=createCloudGateway({accountIsolation:false,supabaseUrl:'https://db.example.test',serviceKey:'synthetic-service',publishableKey:'synthetic-public',allowedOrigins:[site],resendKey:'synthetic-mail',
  fetchImpl:async(url,request)=>{
   const path=new URL(url).pathname,body=request.body?JSON.parse(request.body):{};calls.push({path,body,method:request.method});
   if(path==='/rest/v1/rpc/sp_mail_reserve')return options.reserveFailure?response({code:'PGRST202'},404):response(null);
   if(path==='/auth/v1/admin/generate_link')return options.unknown?response({code:'user_not_found'},404):response({hashed_token:rawKey});
   if(path==='/emails'){sent++;return options.mailFailure?response({message:'Rejected'},400):response({id:'mail-accepted'});}
   if(path==='/auth/v1/user'){
    if(request.method==='PUT'){updated++;return options.weak?response({code:'weak_password'},422):response(user);}
    return options.stale?response({code:'temporary_auth_failure'},503):response(user);
   }
   if(path==='/auth/v1/token')return options.stale&&body.refresh_token?response({code:'temporary_auth_failure'},503):response({user,access_token:'valid-access',refresh_token:'valid-refresh',expires_in:3600});
   if(path==='/auth/v1/verify'){verified++;return options.expired?response({code:'otp_expired'},403):response({access_token:'reset-session',user});}
   if(path==='/auth/v1/logout')return response({});
   throw Error('Unexpected request '+path);
  }});
 const request=async(path,body,cookie='sp_access=old-access; sp_refresh=old-refresh')=>{
  const response=await gateway(new Request(site+'/simulou-passou/api'+path,{method:'POST',headers:{Origin:site,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  return {status:response.status,headers:response.headers,data:await response.json()};
 };
 return {request,calls,get verified(){return verified;},get updated(){return updated;},get sent(){return sent;}};
}
test('login, recuperação e link de redefinição ignoram sessão antiga com falha',async()=>{
 const f=fixture({stale:true});
 const recovery=await f.request('/auth/recover',{email:'student@example.test'});assert.equal(recovery.status,200);assert.equal(f.sent,1);
 const login=await f.request('/auth/login',{email:'student@example.test',password:'synthetic-password'});assert.equal(login.status,200);
 const reset=await f.request('/auth/reset',{recoveryKey:key,password:'synthetic-new-password'});assert.equal(reset.status,200);assert.equal(f.verified,1);assert.equal(f.updated,1);
 assert.equal(f.calls.filter(c=>c.path==='/auth/v1/user'&&c.method!=='PUT').length,0);
 assert.equal(f.calls.filter(c=>c.path==='/auth/v1/token'&&c.body.refresh_token).length,0);
 assert.ok(!JSON.stringify([recovery.data,login.data,reset.data]).includes('reset-session'));
});
test('falha da infraestrutura ou do remetente não informa sucesso de envio',async()=>{
 for(const options of [{reserveFailure:true},{mailFailure:true}]){
  const f=fixture(options),result=await f.request('/auth/recover',{email:'student@example.test'});
  assert.equal(result.status,503);assert.ok(result.data.error);
  if(options.reserveFailure)assert.equal(f.sent,0);
 }
 const unknown=fixture({unknown:true});assert.equal((await unknown.request('/auth/recover',{email:'unknown@example.test'})).status,200);assert.equal(unknown.sent,0);
});
test('link expirado não altera senha; erro de senha fraca permite repetir sem consumir o link duas vezes',async()=>{
 const expired=fixture({expired:true,stale:true});assert.equal((await expired.request('/auth/reset',{recoveryKey:key,password:'synthetic-password'})).status,401);assert.equal(expired.updated,0);
 const weak=fixture({weak:true,stale:true}),first=await weak.request('/auth/reset',{recoveryKey:key,password:'synthetic-password'});
 assert.equal(first.status,422);assert.match(first.data.error,/mais forte/);
 const recovery=first.headers.get('set-cookie').match(/sp_recovery=([^;]+)/)?.[1];assert.ok(recovery);assert.match(first.headers.get('set-cookie'),/HttpOnly/);
 const second=await weak.request('/auth/reset',{recoveryKey:key,password:'synthetic-password'},'sp_recovery='+recovery);
 assert.equal(second.status,422);assert.equal(weak.verified,1);
});
test('formulário de recuperação exige link e não pede senha anterior quando há chave',()=>{
 const helpers={bar:()=>'',brand:()=>'',icon:()=>'',field:(name)=>'<input name="'+name+'">'};
 const noLink=cloudAuthPage('redefinir',{...helpers,hasSession:false,hasRecoveryKey:false});assert.match(noLink,/Solicitar novo link/);assert.doesNotMatch(noLink,/data-form="reset"/);
 const reset=cloudAuthPage('redefinir',{...helpers,hasSession:true,hasRecoveryKey:true});assert.match(reset,/passwordConfirm/);assert.doesNotMatch(reset,/name="currentPassword"/);
 const account=cloudAccount({user:{name:'Aluno',email:'student@example.test',role:'student',hasAccess:true,allModules:true},preparations:[]},{heading:()=>'',field:()=>'',E:String,notice:String,button:(s,a)=>s+' '+a,link:()=>''});
 assert.match(account,/cloud-purchases/);assert.match(account,/após a confirmação do estorno/);
});
