import {Readable} from 'node:stream';
import {createApp} from '../server.mjs';
import {seed} from '../seed.mjs';

const personal=['attempts','completed','notes','studyTasks','studyPreferences','reviewMarks','focusSessions'];
const catalogKeys=['preparations','materials','questions','quizzes'];
const fault=(status,message,code)=>Object.assign(new Error(message),{status,code});
const copy=x=>structuredClone(x);
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const cookies=header=>Object.fromEntries((header||'').split(';').map(v=>v.trim().split(/=(.*)/s)).filter(v=>v.length>1).map(([k,v])=>[k,v]));
class Capture {
  headers={};status=200;headersSent=false;body='';
  setHeader(k,v){this.headers[k.toLowerCase()]=v;}
  writeHead(status,headers={}){this.status=status;for(const [k,v] of Object.entries(headers))this.setHeader(k,v);this.headersSent=true;}
  end(value=''){this.body=String(value);}
}
export function createCloudGateway({supabaseUrl,serviceKey,publishableKey,allowedOrigins,basePath='/simulou-passou',fetchImpl=fetch,now=()=>Date.now()}){
  if(!supabaseUrl||!serviceKey||!publishableKey||!allowedOrigins?.length)throw new Error('Missing server configuration');
  const origins=new Set(allowedOrigins),cookiePath=basePath+'/api';
  async function supa(path,{method='GET',body,token,key=serviceKey}={}){
    const response=await fetchImpl(supabaseUrl+path,{method,headers:{apikey:key,Authorization:'Bearer '+(token||key),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw fault(response.status,'Falha no serviço de dados.',data.code);
    return data;
  }
  const rpc=(name,body)=>supa('/rest/v1/rpc/'+name,{method:'POST',body});
  return async function gateway(req){
    const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    const origin=req.headers.get('origin');
    if(origins.has(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Credentials','true');headers.set('Vary','Origin');}
    const finish=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
    const cookie=(name,value,age)=>headers.append('Set-Cookie',`${name}=${value}; Path=${cookiePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`);
    const clear=()=>{cookie('sp_access','',0);cookie('sp_refresh','',0);};
    const setSession=session=>{cookie('sp_access',session.access_token,Number(session.expires_in)||3600);cookie('sp_refresh',session.refresh_token,7*86400);};
    let user=null;
    try{
      const url=new URL(req.url),path=url.pathname.replace(/^.*\/simulou-passou-api(?=\/)/,'').replace(/^\/simulou-passou(?=\/)/,'');
      if(req.method==='OPTIONS'){if(!origins.has(origin))return finish({error:'Origem não autorizada.'},403);headers.set('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type');return new Response(null,{status:204,headers});}
      if(!['GET','POST','PATCH','DELETE'].includes(req.method))return finish({error:'Método não permitido.'},405);
      if(req.method!=='GET'&&!origins.has(origin))return finish({error:'Origem não autorizada.'},403);
      if(!path.startsWith('/api/'))return finish({error:'Operação não encontrada.'},404);
      let body={};
      if(req.method!=='GET'){
        if(Number(req.headers.get('content-length')||0)>1000000)throw fault(413,'Conteúdo muito grande.');
        const reader=req.body?.getReader();let size=0;const chunks=[];
        if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1000000){await reader.cancel();throw fault(413,'Conteúdo muito grande.');}chunks.push(value);}
        const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.byteLength;}
        try{body=size?JSON.parse(new TextDecoder().decode(all)):{};}catch{throw fault(400,'Solicitação inválida.');}
        if(!body||typeof body!=='object'||Array.isArray(body))throw fault(400,'Solicitação inválida.');
      }
      const jar=cookies(req.headers.get('cookie'));let token=jar.sp_access;
      if(token){try{user=await supa('/auth/v1/user',{token,key:publishableKey});}catch(e){if(e.status!==401&&e.status!==403)throw e;}}
      if(!user&&jar.sp_refresh){
        try{const session=await supa('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:jar.sp_refresh},key:publishableKey});token=session.access_token;user=session.user;setSession(session);}catch(e){if(e.status>=500)throw e;clear();}
      }
      if(user&&(user.is_anonymous||!user.email)){user=null;clear();}
      if(path==='/api/health'&&req.method==='GET'){await rpc('sp_runtime_load',{p_actor:null});return finish({ok:true,module:'simulou-passou',build:'cloud-1',payments:'disabled'});}
      if(path==='/api/auth/demo'||path.includes('/demo-event'))return finish({error:'Operação de demonstração indisponível.'},404);
      if(path==='/api/auth/register'&&req.method==='POST'){
        const name=String(body.name||'').trim().slice(0,100),email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
        if(!name||!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>128)throw fault(400,'Informe nome, e-mail válido e senha com 8 a 128 caracteres.');
        const result=await supa('/auth/v1/signup?redirect_to='+encodeURIComponent([...origins][0]+basePath+'/'),{method:'POST',body:{email,password,data:{name}},key:publishableKey});
        if(result.access_token)setSession(result);
        return finish({confirmationRequired:!result.access_token,message:result.access_token?'Conta criada.':'Confira seu e-mail para confirmar o cadastro e depois entre na sua conta.'});
      }
      if(path==='/api/auth/login'&&req.method==='POST'){
        try{const session=await supa('/auth/v1/token?grant_type=password',{method:'POST',body:{email:String(body.email||'').trim(),password:String(body.password||'')},key:publishableKey});setSession(session);return finish({ok:true});}
        catch(e){if(e.status>=500)throw e;throw fault(e.status===429?429:401,e.status===429?'Muitas tentativas. Aguarde alguns minutos.':'E-mail ou senha inválidos, ou e-mail ainda não confirmado.');}
      }
      if(path==='/api/auth/logout'&&req.method==='POST'){
        if(user&&token)await supa('/auth/v1/logout?scope=local',{method:'POST',token,key:publishableKey}).catch(()=>{});
        clear();return finish({ok:true});
      }
      if(path==='/api/auth/recover'&&req.method==='POST'){
        await supa('/auth/v1/recover?redirect_to='+encodeURIComponent([...origins][0]+basePath+'/'),{method:'POST',body:{email:String(body.email||'').trim()},key:publishableKey});
        return finish({message:'Se houver uma conta elegível, você receberá um e-mail com o link de recuperação. Verifique também a pasta de spam.'});
      }
      if(path==='/api/auth/callback'&&req.method==='POST'){
        const access=String(body.access_token||''),refresh=String(body.refresh_token||'');
        if(access.length>10000||refresh.length>2000||!access||!refresh)throw fault(400,'Link inválido.');
        await supa('/auth/v1/user',{token:access,key:publishableKey});
        setSession({access_token:access,refresh_token:refresh,expires_in:3600});return finish({ok:true});
      }
      if(path==='/api/auth/reset'&&req.method==='POST'){
        if(!user)throw fault(401,'Abra o link de recuperação recebido por e-mail.');
        const password=String(body.password||'');if(password.length<8||password.length>128)throw fault(400,'Use uma senha com 8 a 128 caracteres.');
        await supa('/auth/v1/user',{method:'PUT',token,key:publishableKey,body:{password}});
        await supa('/auth/v1/logout?scope=local',{method:'POST',token,key:publishableKey}).catch(()=>{});clear();return finish({ok:true});
      }
      if(path.startsWith('/api/auth/'))throw fault(404,'Operação não encontrada.');
      if(!user&&path!=='/api/bootstrap')throw fault(401,'Entre na sua conta para continuar.');
      if(path==='/api/orders'&&req.method==='POST')throw fault(503,'As vendas ainda não estão habilitadas. O conteúdo e as condições comerciais estão em preparação.');
      if(path.startsWith('/api/orders/')||path.includes('/payment'))throw fault(404,'Operação não encontrada.');
      if(/^\/api\/admin\/access\/[^/]+$/.test(path)&&req.method==='PATCH'){
        const state=await rpc('sp_runtime_load',{p_actor:user.id});if(!state.admin)throw fault(403,'Acesso exclusivo da administração.');
        await rpc('sp_module_access',{p_actor:user.id,p_user:path.split('/')[4],p_active:!!body.active});return finish({ok:true});
      }
      for(let retry=0;retry<3;retry++){
        const context=await rpc('sp_runtime_load',{p_actor:user?.id||null});
        const db=seed();for(const key of catalogKeys)db[key]=copy(context.catalog.body[key]||[]);
        db.users=[];db.orders=context.orders||[];db.sessions=[];db.recoveries=[];db.paymentEvents=[];for(const key of personal)db[key]=[];
        const records=context.members||[];
        for(const record of records){const state=record.body;db.users.push({...state.profile,id:record.user_id,role:(context.administrator_ids||[]).includes(record.user_id)?'master':'student',demo:false});for(const key of personal)db[key].push(...copy(state[key]||[]));}
        let identity=null;
        if(user){identity=db.users.find(u=>u.id===user.id);if(!identity){identity={id:user.id,name:user.user_metadata?.name||user.user_metadata?.full_name||'Participante',email:user.email,createdAt:user.created_at};db.users.push(identity);}
          identity.email=user.email;identity.role=context.admin?'master':'student';identity.demo=false;}
        let dirty=false;
        const engine=createApp({dataFile:null,initialDb:db,identity,authorizeAccess:u=>!!u&&(u.id===user?.id?(context.admin||context.entitled):(context.active_users||[]).includes(u.id)||(context.administrator_ids||[]).includes(u.id)),onPersist:()=>{dirty=true;},now});
        const input=Readable.from(req.method==='GET'?[]:[JSON.stringify(body)]);
        Object.assign(input,{headers:{host:'localhost'},url:path,method:req.method});const output=new Capture();
        await engine.handler(input,output);
        const changed=[];
        if(user){for(const member of db.users){
          const previous=records.find(r=>r.user_id===member.id);
          const state={profile:{id:member.id,name:member.name,email:member.email,createdAt:member.createdAt}};
          for(const key of personal)state[key]=db[key].filter(row=>row.userId===member.id);
          if((dirty||member.id===user.id)&&!same(state,previous?.body))changed.push({user_id:member.id,revision:previous?.revision||0,body:state});
        }}
        const nextCatalog=Object.fromEntries(catalogKeys.map(key=>[key,db[key]]));
        const catalogChanged=dirty&&!same(nextCatalog,context.catalog.body);
        if(user&&(changed.length||catalogChanged)){
          try{await rpc('sp_runtime_commit',{p_actor:user.id,p_catalog_revision:context.catalog.revision,p_catalog:catalogChanged?nextCatalog:null,p_members:changed});}
          catch(e){if(e.code==='40001'&&retry<2)continue;throw e.code==='40001'?fault(409,'Outra aba atualizou seus dados. Tente novamente.'):e;}
        }
        let result;try{result=JSON.parse(output.body);}catch{throw fault(500,'Resposta inválida.');}
        if(path==='/api/bootstrap'&&output.status===200){result.local=false;result.checkoutEnabled=false;result.production=true;}
        if(path==='/api/admin'&&output.status===200){for(const member of result.users)member.manualAccess=(context.active_users||[]).includes(member.id);}
        return finish(result,output.status);
      }
      throw fault(409,'Tente novamente.');
    }catch(error){
      const status=Number.isInteger(error.status)&&error.status>=400&&error.status<600?error.status:500;
      if(status>=500)console.error('Simulou Passou request failed:',error.code||status);
      return finish({error:status>=500?(status===503?error.message:'Não foi possível concluir. Tente novamente.'):error.message},status);
    }
  };
}
