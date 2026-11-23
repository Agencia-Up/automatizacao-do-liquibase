import {createHmac,timingSafeEqual,createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

const audience='simulou-passou';
const rawToken=/^[A-Za-z0-9_-]{32,160}$/;
export const recoveryKeyPattern=/^sp1\.[A-Za-z0-9_-]{80,1600}\.[A-Za-z0-9_-]{43}$/;
const signature=(value,key)=>createHmac('sha256',key).update('sp-auth-link-v1\n'+value).digest('base64url');
const cipherKey=(key,scope)=>createHash('sha256').update('simulou-passou/'+scope+'\n'+key).digest();
function seal(value,key,scope,aad){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',cipherKey(key,scope),iv);cipher.setAAD(Buffer.from(aad));
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
function open(value,key,scope,aad){
  const bytes=Buffer.from(value,'base64url');if(bytes.length<29)throw new Error('Invalid product envelope');
  const decipher=createDecipheriv('aes-256-gcm',cipherKey(key,scope),bytes.subarray(0,12));
  decipher.setAAD(Buffer.from(aad));decipher.setAuthTag(bytes.subarray(12,28));
  return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8');
}
export const sealProductCookie=(value,{name,path,serviceKey})=>'spc1.'+seal(value,serviceKey,'session-cookie-v1',name+'\n'+path);
export function openProductCookie(value,{name,path,serviceKey}){
  if(!/^spc1\.[A-Za-z0-9_-]{40,12000}$/.test(value||''))throw new Error('Invalid product cookie');
  return open(value.slice(5),serviceKey,'session-cookie-v1',name+'\n'+path);
}
export function signAuthLink({token,purpose,baseUrl,serviceKey,now=Date.now()}){
  if(!serviceKey||!rawToken.test(token||'')||!['signup','recovery'].includes(purpose))throw new Error('Invalid product link');
  const payload=seal(JSON.stringify({aud:audience,purpose,baseUrl,token,exp:Math.floor(now/1000)+3600}),serviceKey,'auth-link-envelope-v1',audience+'\n'+baseUrl);
  return 'sp1.'+payload+'.'+signature(payload,serviceKey);
}
export function openAuthLink(value,{purpose,baseUrl,serviceKey,now=Date.now()}){
  if(!recoveryKeyPattern.test(value||''))throw new Error('Invalid product link');
  const [,payload,mac]=value.split('.'),expected=signature(payload,serviceKey);
  if(!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))throw new Error('Invalid product link');
  const link=JSON.parse(open(payload,serviceKey,'auth-link-envelope-v1',audience+'\n'+baseUrl));
  if(link.aud!==audience||link.purpose!==purpose||link.baseUrl!==baseUrl||!rawToken.test(link.token||'')
    ||!Number.isSafeInteger(link.exp)||link.exp<=Math.floor(now/1000)||link.exp>Math.floor(now/1000)+3600)throw new Error('Invalid product link');
  return link.token;
}
