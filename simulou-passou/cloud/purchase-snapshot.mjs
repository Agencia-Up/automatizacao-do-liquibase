import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {Buffer} from 'node:buffer';
const key=secret=>createHash('sha256').update('simulou-passou/purchase-envelope/v1\n'+secret).digest();
const context=order=>Buffer.from(order.id+'\n'+(order.generation||1));
export function sealPurchaseMessage(message,order,secret){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(secret),iv);
  cipher.setAAD(context(order));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(message),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
}
export function openPurchaseMessage(value,order,secret){
  const blob=Buffer.from(value,'base64');
  if(blob.length<29)throw new Error('Invalid purchase envelope');
  const cipher=createDecipheriv('aes-256-gcm',key(secret),blob.subarray(0,12));
  cipher.setAAD(context(order));cipher.setAuthTag(blob.subarray(12,28));
  return JSON.parse(Buffer.concat([cipher.update(blob.subarray(28)),cipher.final()]).toString('utf8'));
}
