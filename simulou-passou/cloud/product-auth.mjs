import {randomBytes} from 'node:crypto';
import {createAccountMail} from './branded-mail.mjs';
import {sealProductCookie,openProductCookie} from './auth-links.mjs';

// Supabase still owns password hashing and sessions. The private mapping keeps
// a product Auth identity separate from the student's existing Logos account.
export function createProductAuth({supa,rpc,publishableKey,fault,serviceKey,baseUrl}){
  const identity=(email=null,authId=null,create=false)=>rpc('sp_product_identity',{p_email:email,p_auth_user:authId,p_create:create});
  const ensure=async(account,{password='Sp9!'+randomBytes(32).toString('base64url'),confirmed=true}={})=>{
    if(account.exists)return account;
    if(!account.authUserId)account=await identity(account.email,null,true);
    try{
      await supa('/auth/v1/admin/users',{method:'POST',body:{id:account.authUserId,email:account.authEmail,password,
        email_confirm:confirmed,user_metadata:{name:account.name},app_metadata:{product_origin:'simulou-passou'}}});
    }catch(error){if(![400,422].includes(error.status))throw error;}
    const saved=await identity(account.email);
    if(!saved?.exists)throw fault(503,'Não foi possível preparar seu acesso ao Simulou Passou. Tente novamente.');
    return saved;
  };
  const resolve=async(user)=>{
    if(!user?.id||user.is_anonymous)return null;
    const account=await identity(null,user.id);
    if(!account?.exists||account.authUserId!==user.id||account.authEmail.toLowerCase()!==user.email?.toLowerCase())return null;
    return {...user,id:account.memberId,authId:user.id,authEmail:account.authEmail,email:account.email};
  };
  const login=async(email,password)=>{
    let account=await identity(email);
    if(!account)throw fault(401,'E-mail ou senha inválidos, ou e-mail ainda não confirmado.');
    if(!account.exists){
      if(!account.legacy)throw fault(401,'Confirme o cadastro recebido por e-mail.');
      // One-time upgrade: validate the old credential, preserve all study data,
      // and create an independent product password. Never write the Logos user.
      const legacy=await supa('/auth/v1/token?grant_type=password',{method:'POST',key:publishableKey,body:{email,password}});
      if(legacy.user?.id!==account.memberId||!legacy.access_token)throw fault(401,'E-mail ou senha inválidos.');
      await supa('/auth/v1/logout?scope=local',{method:'POST',token:legacy.access_token,key:publishableKey});
      account=await ensure(await identity(email,null,true),{password});
    }
    const session=await supa('/auth/v1/token?grant_type=password',{method:'POST',key:publishableKey,body:{email:account.authEmail,password}});
    const user=await resolve(session.user);
    if(!user||!session.access_token||!session.refresh_token)throw fault(401,'E-mail ou senha inválidos.');
    return session;
  };
  const recovery=async(email)=>{
    const account=await identity(email);
    if(!account)return null;
    return account.exists?account:ensure(await identity(email,null,true));
  };
  const registration=async(email,name,password)=>{
    const account=await identity(email,null,true);
    if(account.exists&&account.confirmed)return null;
    return ensure({...account,name},{password,confirmed:false});
  };
  const probe=async()=>{
    const recipient='probe+'+randomBytes(12).toString('hex')+'@simulou-passou.example';
    const first='Sp9!'+randomBytes(32).toString('base64url'),second='Sp9!'+randomBytes(32).toString('base64url');
    const checks={signup:false,login:false,recovery:false,newPassword:false,oldPasswordRejected:false,mailTemplate:false,cookieEncoding:false,cleaned:false,customerEmails:0};
    let account;
    try{
      account=await registration(recipient,'Verificação técnica',first);
      const cookieOptions={name:'sp_product_access',path:'/simulou-passou/api',serviceKey};
      checks.cookieEncoding=openProductCookie(sealProductCookie('diagnostic-session',cookieOptions),cookieOptions)==='diagnostic-session';
      const captureMail=createAccountMail({supa,baseUrl,serviceKey,resendKey:'diagnostic-no-send',fault,
        fetchImpl:async(url,request)=>{
          const message=JSON.parse(request.body);
          checks.mailTemplate=url==='https://api.resend.com/emails'&&message.to?.[0]===recipient
            &&message.from==='Simulou Passou <simuloupassou@logosiabrasil.com>'&&message.html.includes('/#/redefinir?chave=sp1.');
          return new Response(JSON.stringify({id:'diagnostic-capture'}),{status:200});
        }});
      await captureMail({email:recipient,authEmail:account.authEmail});
      const generated=await supa('/auth/v1/admin/generate_link',{method:'POST',body:{type:'signup',email:account.authEmail,password:first}});
      const confirmed=await supa('/auth/v1/verify',{method:'POST',key:publishableKey,body:{type:'signup',token_hash:generated.hashed_token||generated.properties?.hashed_token}});
      checks.signup=!!await resolve(confirmed.user);
      await supa('/auth/v1/logout?scope=local',{method:'POST',token:confirmed.access_token,key:publishableKey});
      const session=await login(recipient,first);checks.login=!!await resolve(session.user);
      await supa('/auth/v1/logout?scope=local',{method:'POST',token:session.access_token,key:publishableKey});
      const recovered=await supa('/auth/v1/admin/generate_link',{method:'POST',body:{type:'recovery',email:account.authEmail}});
      const reset=await supa('/auth/v1/verify',{method:'POST',key:publishableKey,body:{type:'recovery',token_hash:recovered.hashed_token||recovered.properties?.hashed_token}});
      checks.recovery=!!await resolve(reset.user);
      await supa('/auth/v1/user',{method:'PUT',token:reset.access_token,key:publishableKey,body:{password:second}});
      await supa('/auth/v1/logout?scope=local',{method:'POST',token:reset.access_token,key:publishableKey});
      const changed=await login(recipient,second);checks.newPassword=!!await resolve(changed.user);
      await supa('/auth/v1/logout?scope=local',{method:'POST',token:changed.access_token,key:publishableKey});
      try{await login(recipient,first);}catch(error){if(error.status===400||error.status===401)checks.oldPasswordRejected=true;else throw error;}
    }catch(error){checks.error=error.code||'auth_probe_'+(error.status||'failed');}
    finally{
      if(account?.authUserId){
        try{await supa('/auth/v1/admin/users/'+account.authUserId,{method:'DELETE'});checks.cleaned=true;}catch{checks.error='probe_cleanup_failed';}
      }
    }
    return {ok:checks.signup&&checks.login&&checks.recovery&&checks.newPassword&&checks.oldPasswordRejected&&checks.mailTemplate&&checks.cookieEncoding&&checks.cleaned,...checks};
  };
  return {resolve,login,recovery,registration,probe};
}
