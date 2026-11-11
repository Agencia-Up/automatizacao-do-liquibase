import http from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,join,resolve,extname} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {seed,uid} from './seed.mjs';
import {createWorkspace} from './workspace.mjs';

const ROOT=dirname(fileURLToPath(import.meta.url));
const PRICE=2990;
const OFFERS={module:PRICE,all:4990};
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const text=(v,max=10000)=>String(v??'').trim().slice(0,max);
const requireText=(v,label,max=200)=>{const s=text(v,max);if(!s)fail(400,`Preencha ${label}.`);return s;};
const clone=x=>JSON.parse(JSON.stringify(x));
const hash=(password,salt=randomBytes(16).toString('hex'))=>`${salt}:${scryptSync(password,salt,32).toString('hex')}`;
const passwordOk=(p,stored)=>{try{const [salt,key]=stored.split(':');return timingSafeEqual(Buffer.from(key,'hex'),scryptSync(p,salt,32));}catch{return false;}};
const safeUser=u=>u?{id:u.id,name:u.name,email:u.email,role:u.role,demo:!!u.demo}:null;

export function createApp({dataFile=join(ROOT,'data','local.json'),now=()=>Date.now(),basePath='',initialDb,identity,authorizeAccess,onPersist}={}) {
  if(basePath==='/'||basePath==='')basePath='';
  else if(typeof basePath!=='string'||!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/i.test(basePath))throw new TypeError('Prefixo de URL inválido.');
  else basePath=basePath.replace(/\/$/,'');
  let db=initialDb??(dataFile&&existsSync(dataFile)?JSON.parse(readFileSync(dataFile,'utf8')):seed());
  const persist=()=>{onPersist?.();if(dataFile){mkdirSync(dirname(dataFile),{recursive:true});writeFileSync(`${dataFile}.tmp`,JSON.stringify(db,null,2));renameSync(`${dataFile}.tmp`,dataFile);}};
  const stamp=()=>new Date(now()).toISOString();
  const access=(u,prepId)=>authorizeAccess?authorizeAccess(u,prepId):!!u&&(u.role==='master'||u.localAccess===true||db.orders.some(o=>o.userId===u.id&&o.status==='paid'));
  const publicQuiz=q=>{const qs=q.questionIds.map(id=>db.questions.find(x=>x.id===id)).filter(Boolean);return {...q,questionIds:undefined,count:qs.length,objectiveCount:qs.filter(x=>x.type==='objective').length,essayCount:qs.filter(x=>x.type==='essay').length,totalPoints:qs.reduce((n,x)=>n+x.points,0),optionCounts:[...new Set(qs.filter(x=>x.type==='objective').map(x=>x.options.length))]};};
  const sessionUser=req=>{if(identity!==undefined)return identity;const cookie=req.headers.cookie||'';const sid=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('logos_local='))?.slice(12);const s=db.sessions.find(x=>x.token===sid&&x.expires>now());return s?db.users.find(x=>x.id===s.userId):null;};
  const needUser=req=>sessionUser(req)||fail(401,'Entre na sua conta para continuar.');
  const needMaster=req=>{const u=needUser(req);if(u.role!=='master')fail(403,'Esta área é exclusiva da administração local.');return u;};
  const needAccess=(req,prepId)=>{const u=needUser(req);if(!access(u,prepId))fail(403,prepId?'Este módulo ainda não está liberado para sua conta.':'Seu acesso ainda não está liberado.');return u;};
  const startSession=(res,u)=>{const token=randomBytes(32).toString('hex');db.sessions.push({token,userId:u.id,expires:now()+7*86400000});res.setHeader('Set-Cookie',`logos_local=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`);persist();return {...safeUser(u),hasAccess:access(u)};};
  const ownAttempt=(req,id)=>{const u=needAccess(req),a=db.attempts.find(x=>x.id===id&&x.userId===u.id);if(!a)fail(404,'Tentativa não encontrada.');needAccess(req,a.prepId);return a;};
  function score(a) {
    const objs=a.questions.filter(q=>q.type==='objective');let correct=0,wrong=0,blank=0,points=0,pending=0;
    for(const q of a.questions){const answer=a.answers[q.id];if(q.type==='objective'){if(answer===undefined||answer==='')blank++;else if(answer===q.correct){correct++;points+=q.points;}else wrong++;}else if(text(answer)){if(a.grades[q.id])points+=a.grades[q.id].points;else pending++;}}
    const totalPoints=a.questions.reduce((n,q)=>n+q.points,0);
    const subjects=[...new Set(objs.map(q=>q.subject))].map(subject=>{const qs=objs.filter(q=>q.subject===subject);return {subject,total:qs.length,correct:qs.filter(q=>a.answers[q.id]===q.correct).length};});
    return {correct,wrong,blank,subjects,objectiveTotal:objs.length,accuracy:objs.length?correct/objs.length*100:null,points,totalPoints,weightedPercent:totalPoints?points/totalPoints*100:0,pending,approved:pending||a.rules.passPercent===null?null:(points/totalPoints*100>=a.rules.passPercent)};
  }
  function finish(a){
    if(a.status==='in_progress'){
      const deadline=a.deadline?Date.parse(a.deadline):Infinity;
      const endedAt=Math.min(now(),deadline);
      a.finishedAt=new Date(endedAt).toISOString();
      a.finishReason=endedAt===deadline?'timeout':'submitted';
      a.elapsedSeconds=Math.max(0,Math.round((endedAt-Date.parse(a.startedAt))/1000));
      a.result=score(a);
      a.status=a.result.pending?'awaiting_review':'completed';
      a.updatedAt=stamp();
      persist();
    }
    return a;
  }
  function viewAttempt(a){if(a.status==='in_progress'&&a.deadline&&now()>=Date.parse(a.deadline))finish(a);const canReview=a.status!=='in_progress'&&a.rules.review;return {...a,serverNow:now(),questions:a.questions.map(q=>{const {correct,explanation,rubric,...visible}=q;return canReview?{...visible,correct,explanation,...(q.type==='essay'?{rubric}:{} )}:visible;})};}
  function quizInput(input,current={}){
    const q={...current,...input};q.name=requireText(q.name,'o nome do simulado');if(!db.preparations.some(p=>p.id===q.prepId))fail(400,'Escolha uma preparação válida.');
    if(!Array.isArray(q.questionIds)||!q.questionIds.length||new Set(q.questionIds).size!==q.questionIds.length||q.questionIds.some(id=>!db.questions.some(x=>x.id===id&&x.prepId===q.prepId)))fail(400,'Selecione questões diferentes da mesma preparação.');
    q.durationMinutes=q.durationMinutes===''||q.durationMinutes==null?null:Number(q.durationMinutes);q.passPercent=q.passPercent===''||q.passPercent==null?null:Number(q.passPercent);q.maxAttempts=q.maxAttempts===''||q.maxAttempts==null?null:Number(q.maxAttempts);
    if(q.durationMinutes!==null&&(!Number.isInteger(q.durationMinutes)||q.durationMinutes<1||q.durationMinutes>1440))fail(400,'Duração inválida.');
    if(q.passPercent!==null&&(!Number.isFinite(q.passPercent)||q.passPercent<0||q.passPercent>100))fail(400,'Critério de aprovação inválido.');
    if(q.maxAttempts!==null&&(!Number.isInteger(q.maxAttempts)||q.maxAttempts<1))fail(400,'Limite de tentativas inválido.');
    return {id:current.id||uid(),prepId:q.prepId,name:q.name,description:text(q.description,1000),questionIds:q.questionIds,durationMinutes:q.durationMinutes,passPercent:q.passPercent,maxAttempts:q.maxAttempts,status:q.status==='published'?'published':'draft',review:q.review!==false,calculator:q.calculator===true};
  }
  const workspace=createWorkspace({db,now,stamp,persist,needUser,needAccess,access,viewAttempt});
  const handler=async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    try {
      const hostname=new URL('http://'+(req.headers.host||'localhost')).hostname;
      if(!['127.0.0.1','localhost','[::1]'].includes(hostname))fail(403,'Esta prévia aceita somente acesso local.');
      const url=new URL(req.url,'http://localhost');const method=req.method;
      if(basePath&&url.pathname===basePath&&method==='GET'){res.writeHead(308,{Location:basePath+'/'+url.search});res.end();return;}
      if(basePath&&!url.pathname.startsWith(basePath+'/'))fail(404,'Arquivo não encontrado.');
      const path=basePath?url.pathname.slice(basePath.length):url.pathname;
      if(!path.startsWith('/api/')){
        const file=path==='/'?'index.html':path.slice(1);const full=resolve(ROOT,'public',file);
        if(!['index.html','app.js','cloud-ui.js','exam-ui.js','exam-finance.js','exam.css','simulou-passou-logo.png','styles.css','mobile.css','planner.js','roteiro-conteudo.txt','modelo-prova.json'].includes(file))fail(404,'Arquivo não encontrado.');
        const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};
        res.writeHead(200,{'Content-Type':types[extname(full)],'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});res.end(readFileSync(full));return;
      }
      res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
      if(!['GET','HEAD'].includes(method)&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)fail(403,'Origem não autorizada.');
      let b={};if(!['GET','HEAD'].includes(method)){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1_000_000)fail(413,'Conteúdo muito grande.');}if(raw){try{b=JSON.parse(raw);}catch{fail(400,'Solicitação inválida.');}}}
      let result;
      const workspaceResult=workspace(req,path,method,b);
      if(workspaceResult)result=workspaceResult.data;
      else if(path==='/api/bootstrap'&&method==='GET'){
        const u=sessionUser(req);result={local:true,price:PRICE,offers:OFFERS,user:u?{...safeUser(u),hasAccess:access(u)}:null,preparations:db.preparations,quizzes:db.quizzes.filter(q=>q.status==='published'&&db.preparations.some(p=>p.id===q.prepId&&p.status==='published')).map(publicQuiz),materials:db.materials.filter(m=>m.status==='published'&&db.preparations.some(p=>p.id===m.prepId&&p.status==='published')).map(({body,...m})=>m),completed:u?db.completed.filter(x=>x.userId===u.id):[],attempts:u?db.attempts.filter(a=>a.userId===u.id&&access(u,a.prepId)).map(a=>{viewAttempt(a);const {questions,answers,flags,grades,tools,...summary}=a;return summary;}):[]};
      } else if(path==='/api/auth/register'&&method==='POST'){
        const email=text(b.email,254).toLowerCase(),name=requireText(b.name,'seu nome',100),password=String(b.password||'');
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Informe um e-mail válido.');if(password.length<8||password.length>128)fail(400,'Use uma senha com 8 a 128 caracteres.');if(db.users.some(u=>u.email===email))fail(409,'Este e-mail já tem uma conta. Entre para continuar.');
        const u={id:uid(),name,email,password:hash(password),role:'student',createdAt:stamp()};db.users.push(u);result=startSession(res,u);
      } else if(path==='/api/auth/login'&&method==='POST'){
        const u=db.users.find(u=>u.email===text(b.email).toLowerCase());if(!u||!passwordOk(String(b.password||''),u.password))fail(401,'E-mail ou senha inválidos.');result=startSession(res,u);
      } else if(path==='/api/auth/demo'&&method==='POST'){
        // Deliberately local-only role entry, exposed as a labelled demo control.
        // The server binds loopback only; this endpoint must never ship to production.
        const role=b.role==='master'?'master':'student';let u=db.users.find(u=>u.demo&&u.role===role);
        if(!u){u={id:uid(),name:role==='master'?'Marina · administração':'Alex · demonstração',email:`${role}@demonstracao.local`,role,demo:true,localAccess:true,createdAt:stamp()};db.users.push(u);}result=startSession(res,u);
      } else if(path==='/api/auth/logout'&&method==='POST'){
        const u=sessionUser(req);const token=(req.headers.cookie||'').match(/logos_local=([^;]+)/)?.[1];db.sessions=db.sessions.filter(s=>s.token!==token);res.setHeader('Set-Cookie','logos_local=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');persist();result={ok:true};
      } else if(path==='/api/auth/recover'&&method==='POST'){
        const u=db.users.find(u=>u.email===text(b.email).toLowerCase()&&!u.demo);let resetPath=null;
        if(u){const token=randomBytes(32).toString('hex');db.recoveries.push({token,userId:u.id,expires:now()+1800000});resetPath=`#/redefinir?token=${token}`;persist();}result={message:'Nesta prévia, nenhum e-mail é enviado. Se existir uma conta local, use o link de recuperação abaixo.',resetPath};
      } else if(path==='/api/auth/reset'&&method==='POST'){
        const item=db.recoveries.find(x=>x.token===b.token&&x.expires>now());if(!item)fail(400,'Link expirado ou inválido. Solicite outro.');const p=String(b.password||'');if(p.length<8||p.length>128)fail(400,'Use uma senha com 8 a 128 caracteres.');db.users.find(u=>u.id===item.userId).password=hash(p);db.recoveries=db.recoveries.filter(x=>x.userId!==item.userId);db.sessions=db.sessions.filter(x=>x.userId!==item.userId);persist();result={ok:true};
      } else if(path==='/api/me'&&method==='PATCH'){
        const u=needUser(req);u.name=requireText(b.name,'seu nome',100);persist();result=safeUser(u);
      } else if(path==='/api/orders'&&method==='GET'){
        const u=needUser(req);result=db.orders.filter(o=>o.userId===u.id);
      } else if(path==='/api/orders'&&method==='POST'){
        const u=needUser(req);if(access(u))result={alreadyActive:true};else{let o=db.orders.find(o=>o.userId===u.id&&o.status==='pending');if(!o){o={id:uid(),userId:u.id,amount:PRICE,currency:'BRL',status:'pending',demo:true,createdAt:stamp()};db.orders.push(o);persist();}result=o;}
      } else if(/^\/api\/orders\/[^/]+\/demo-event$/.test(path)&&method==='POST'){
        const u=needUser(req),id=path.split('/')[3],o=db.orders.find(o=>o.id===id&&o.userId===u.id);if(!o)fail(404,'Compra não encontrada.');
        const eventId=requireText(b.eventId,'o identificador do evento',100);if(!['pending','paid','declined'].includes(b.status))fail(400,'Situação inválida.');
        if(!db.paymentEvents.some(e=>e.id===eventId&&e.orderId===o.id)){db.paymentEvents.push({id:eventId,orderId:o.id,status:b.status});if(o.status!=='paid')o.status=b.status;o.updatedAt=stamp();persist();}result={...o,hasAccess:access(u)};
      } else if(/^\/api\/materials\/[^/]+$/.test(path)&&method==='GET'){
        needAccess(req);const m=db.materials.find(m=>m.id===path.split('/')[3]&&m.status==='published'&&db.preparations.some(p=>p.id===m.prepId&&p.status==='published'));if(!m)fail(404,'Material não disponível.');needAccess(req,m.prepId);result=m;
      } else if(/^\/api\/materials\/[^/]+\/complete$/.test(path)&&method==='POST'){
        const u=needAccess(req),id=path.split('/')[3];const m=db.materials.find(m=>m.id===id&&m.status==='published'&&db.preparations.some(p=>p.id===m.prepId&&p.status==='published'));if(!m)fail(404,'Material não disponível.');needAccess(req,m.prepId);db.completed=db.completed.filter(x=>!(x.userId===u.id&&x.materialId===id));if(b.completed)db.completed.push({userId:u.id,materialId:id,at:stamp()});persist();result={ok:true};
      } else if(path==='/api/attempts'&&method==='POST'){
        const u=needAccess(req),q=db.quizzes.find(q=>q.id===b.quizId&&q.status==='published'&&db.preparations.some(p=>p.id===q.prepId&&p.status==='published'));if(!q)fail(404,'Simulado não disponível.');needAccess(req,q.prepId);
        const previous=db.attempts.find(a=>a.userId===u.id&&a.quizId===q.id&&a.status==='in_progress');if(previous){viewAttempt(previous);if(previous.status==='in_progress'){result=viewAttempt(previous);}}
        if(!result){if(q.maxAttempts&&u.role!=='master'&&db.attempts.filter(a=>a.userId===u.id&&a.quizId===q.id).length>=q.maxAttempts)fail(409,'Você atingiu o limite de tentativas deste simulado.');const a={id:uid(),userId:u.id,quizId:q.id,quizName:q.name,prepId:q.prepId,isTest:u.role==='master',status:'in_progress',startedAt:stamp(),updatedAt:stamp(),deadline:q.durationMinutes?new Date(now()+q.durationMinutes*60000).toISOString():null,rules:{durationMinutes:q.durationMinutes,passPercent:q.passPercent,review:q.review,maxAttempts:q.maxAttempts,calculator:q.calculator===true},questions:clone(q.questionIds.map(id=>db.questions.find(x=>x.id===id))),answers:{},flags:[],grades:{}};db.attempts.push(a);persist();result=viewAttempt(a);}
      } else if(/^\/api\/attempts\/[^/]+$/.test(path)&&method==='GET'){
        result=viewAttempt(ownAttempt(req,path.split('/')[3]));
      } else if(/^\/api\/attempts\/[^/]+\/save$/.test(path)&&method==='POST'){
        const a=ownAttempt(req,path.split('/')[3]);viewAttempt(a);if(a.status!=='in_progress')fail(409,'Esta tentativa já foi encerrada.');const answers={};
        for(const q of a.questions){if(b.answers&&Object.hasOwn(b.answers,q.id)){const value=text(b.answers[q.id],4000);if(q.type==='objective'&&value!==''&&!q.options.some((_,i)=>String(i)===value))fail(400,'Alternativa inválida.');answers[q.id]=value;}}
        if(Object.hasOwn(b,'tools')){
          const tools={};
          for(const q of a.questions){
            const marks=b.tools&&Object.hasOwn(b.tools,q.id)?b.tools[q.id]:null;
            if(!marks||typeof marks!=='object')continue;
            const crossed=q.type==='objective'&&Array.isArray(marks.crossed)?[...new Set(marks.crossed.filter(i=>Number.isInteger(i)&&i>=0&&i<q.options.length&&String(i)!==answers[q.id]))]:[];
            const ranges=Array.isArray(marks.highlights)?marks.highlights.slice(0,24).filter(r=>Array.isArray(r)&&r.length===2&&r.every(Number.isInteger)&&r[0]>=0&&r[1]>r[0]&&r[1]<=q.prompt.length).sort((a,b)=>a[0]-b[0]):[];
            const highlights=[];
            for(const range of ranges){
              const last=highlights.at(-1);
              if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);
              else highlights.push(range.slice());
            }
            if(crossed.length||highlights.length)tools[q.id]={crossed,highlights};
          }
          a.tools=tools;
        }
        a.answers=answers;a.flags=Array.isArray(b.flags)?[...new Set(b.flags.filter(id=>a.questions.some(q=>q.id===id)))]:[];a.updatedAt=stamp();persist();result={ok:true,updatedAt:a.updatedAt};
      } else if(/^\/api\/attempts\/[^/]+\/finish$/.test(path)&&method==='POST'){
        result=viewAttempt(finish(ownAttempt(req,path.split('/')[3])));
      } else if(path==='/api/admin'&&method==='GET'){
        needMaster(req);result={preparations:db.preparations,materials:db.materials,questions:db.questions,quizzes:db.quizzes,users:db.users.map(u=>({...safeUser(u),hasAccess:access(u),manualAccess:!!u.localAccess})),orders:db.orders,attempts:db.attempts.map(a=>{viewAttempt(a);return a;}),pending:db.attempts.filter(a=>a.status==='awaiting_review')};
      } else if(/^\/api\/admin\/access\/[^/]+$/.test(path)&&method==='PATCH'){
        needMaster(req);const u=db.users.find(u=>u.id===path.split('/')[4]);if(!u)fail(404,'Aluno não encontrado.');u.localAccess=!!b.active;persist();result={ok:true};
      } else if(path==='/api/admin/grade'&&method==='POST'){
        needMaster(req);const a=db.attempts.find(x=>x.id===b.attemptId&&x.status!=='in_progress'),q=a?.questions.find(x=>x.id===b.questionId&&x.type==='essay');if(!q||!text(a.answers[q.id]))fail(400,'Resposta discursiva não disponível para correção.');const points=Number(b.points);if(!Number.isFinite(points)||points<0||points>q.points)fail(400,`A nota deve estar entre 0 e ${q.points}.`);a.grades[q.id]={points,feedback:requireText(b.feedback,'o feedback',3000),gradedAt:stamp()};a.result=score(a);a.status=a.result.pending?'awaiting_review':'completed';a.updatedAt=stamp();persist();result={ok:true};
      } else if(/^\/api\/admin\/(preparations|materials|questions|quizzes)(\/[^/]+)?$/.test(path)&&['POST','PATCH'].includes(method)){
        needMaster(req);const [, , ,collection,id]=path.split('/');const existing=id?db[collection].find(x=>x.id===id):null;if(id&&!existing)fail(404,'Registro não encontrado.');const input={...existing,...b};let item;
        if(collection==='preparations'){item={id:existing?.id||uid(),name:requireText(input.name,'o nome'),description:text(input.description,2000),status:input.status==='published'?'published':'draft',demo:existing?.demo??true,color:existing?.color||'brass',track:existing?.track,training:existing?.training,subjects:existing?.subjects};if(existing&&item.status==='published'&&!db.materials.some(m=>m.prepId===id&&m.status==='published')&&!db.quizzes.some(q=>q.prepId===id&&q.status==='published'))fail(400,'Adicione conteúdo publicado antes de publicar a preparação.');if(!existing)item.status='draft';}
        if(collection==='materials'){if(!db.preparations.some(p=>p.id===input.prepId))fail(400,'Preparação inválida.');item={id:existing?.id||uid(),prepId:input.prepId,module:requireText(input.module,'o módulo'),title:requireText(input.title,'o título'),body:requireText(input.body,'o conteúdo',30000),format:input.format==='link'?'link':'text',status:input.status==='published'?'published':'draft'};if(item.format==='link'&&!/^https:\/\/[^\s]+$/.test(item.body))fail(400,'Use um link HTTPS válido.');}
        if(collection==='questions'){if(!db.preparations.some(p=>p.id===input.prepId))fail(400,'Preparação inválida.');const type=input.type==='essay'?'essay':'objective';const options=type==='objective'?(Array.isArray(input.options)?input.options.map(x=>text(x,1000)).filter(Boolean):[]):[];const points=Number(input.points);if(!Number.isFinite(points)||points<=0||points>100)fail(400,'Informe uma pontuação entre 0 e 100.');if(type==='objective'&&(options.length<2||options.length>8||!options.some((_,i)=>String(i)===String(input.correct))))fail(400,'Informe de 2 a 8 alternativas e uma resposta correta.');item={id:existing?.id||uid(),prepId:input.prepId,subject:requireText(input.subject,'o assunto'),prompt:requireText(input.prompt,'o enunciado',5000),type,options,correct:type==='objective'?String(input.correct):null,points,explanation:requireText(input.explanation,'a explicação ou resposta de referência',5000),rubric:type==='essay'?requireText(input.rubric,'o critério de correção',3000):undefined};}
        if(collection==='quizzes')item=quizInput(b,existing||{});
        if(existing)db[collection][db[collection].findIndex(x=>x.id===id)]=item;else db[collection].push(item);persist();result=item;
      } else fail(404,'Página ou operação não encontrada.');
      res.writeHead(200);res.end(JSON.stringify(result));
    } catch(error){const status=error.code||500;if(status>=500)console.error(error);if(!res.headersSent)res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:status>=500?'Não foi possível concluir. Tente novamente.':error.message}));}
  };
  const server=http.createServer(handler);
  return {server,db,score,handler};
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const port=Number(process.env.PORT||4178),basePath=process.env.BASE_PATH||'';const {server}=createApp({basePath});server.listen(port,'127.0.0.1',()=>console.log(`Simulou Passou — prévia LOCAL: http://127.0.0.1:${port}${basePath}/\nDados de demonstração persistidos neste computador. Nenhuma cobrança real.`));}
