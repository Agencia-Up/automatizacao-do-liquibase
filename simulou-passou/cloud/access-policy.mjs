export function paidAccess(orders,mode,now){
  const allUsers=new Set(),modules=new Map(),expirations=new Map(),expiredUsers=new Set();
  for(const order of orders||[]){
    if(order.status!=='paid'||!order.prepId||order.providerMode!==mode)continue;
    const expiry=order.accessExpiresAt?Date.parse(order.accessExpiresAt):null;
    if(expiry!==null&&Number.isFinite(expiry))expirations.set(order.userId,Math.max(expirations.get(order.userId)||0,expiry));
    if((order.annualAccess&&expiry===null)||(expiry!==null&&(!Number.isFinite(expiry)||expiry<=now))){expiredUsers.add(order.userId);continue;}
    if(['all','legacy',undefined].includes(order.offer)){allUsers.add(order.userId);continue;}
    if(order.offer==='module'){
      if(!modules.has(order.userId))modules.set(order.userId,new Set());
      modules.get(order.userId).add(order.prepId);
    }
  }
  return {allUsers,modules,expirations,expiredUsers};
}
