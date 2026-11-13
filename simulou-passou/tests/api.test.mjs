import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {seed} from '../seed.mjs';
import {pqoCatalog} from '../pqo-catalog.mjs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {unlinkSync,existsSync} from 'node:fs';

async function fixture(t,initialDb){let time=Date.now();const app=createApp({dataFile:null,now:()=>time,initialDb});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;t.after(()=>new Promise(r=>app.server.close(r)));function client(){let cookie='';return async(path,method='GET',body,headers={})=>{const res=await fetch(origin+'/api'+path,{method,headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});const c=res.headers.get('set-cookie');if(c)cookie=c.split(';')[0];return {status:res.status,data:await res.json()};};}return {...app,client,origin,advance:ms=>time+=ms};}
async function register(c,email='aluno@example.test'){return c('/auth/register','POST',{name:'Aluno de teste',email,password:'TesteLocal123!'});}
async function master(c){return c('/auth/demo','POST',{role:'master'});}
async function student(c){return c('/auth/demo','POST',{role:'student'});}
async function paid(c){const order=(await c('/orders','POST',{})).data;await c('/orders/'+order.id+'/demo-event','POST',{status:'paid',eventId:'payment-'+order.id});return order;}

test('Recertificação PQO Operações aplica 30 questões e revela o gabarito comentado ao encerrar em 3h',async t=>{
  const quizId='pqo-recertificacao-operacoes';
  const catalog=pqoCatalog();
  const db={...seed(),...catalog};
  const quiz=catalog.quizzes.find(q=>q.id===quizId);
  const questions=quiz.questionIds.map(id=>catalog.questions.find(q=>q.id===id));
  assert.equal(new Set(quiz.questionIds).size,60);
  assert.equal(quiz.questionsPerAttempt,30);
  assert.deepEqual(questions.filter(q=>q.subject.startsWith('Cadastro de ')).map(q=>q.subject).sort(),
    ['Cadastro de não residentes','Cadastro de residentes']);
  assert.ok(questions.filter(q=>q.subject==='Ambiente de negociação').length>7);
  assert.ok(questions.every(q=>q.type==='objective'&&new Set(q.options).size===4&&q.points===1));
  const f=await fixture(t,db),c=f.client();
  await master(c);
  const {data:attempt}=await c('/attempts','POST',{quizId});
  assert.equal(attempt.questions.length,30);
  assert.equal(Date.parse(attempt.deadline)-Date.parse(attempt.startedAt),180*60_000);
  assert.equal(attempt.rules.passPercent,60);
  assert.ok(attempt.questions.every(q=>!('correct' in q)&&!('explanation' in q)));
  const drawn=attempt.questions.map(q=>questions.find(x=>x.id===q.id));
  const answers=Object.fromEntries(drawn.slice(0,18).map(q=>[q.id,q.correct]));
  answers[drawn[18].id]=String((Number(drawn[18].correct)+1)%4);
  assert.equal((await c('/attempts/'+attempt.id+'/save','POST',{answers})).status,200);
  f.advance(180*60_000);
  const {data:result}=await c('/attempts/'+attempt.id);
  assert.equal(result.finishReason,'timeout');
  assert.equal(result.status,'completed');
  assert.equal(result.result.approved,true);
  assert.deepEqual([result.result.correct,result.result.wrong,result.result.blank],[18,1,11]);
  for(const q of result.questions){
    const letters=[...q.explanation.matchAll(/ ([A-D]) — /g)].map(match=>match[1]);
    if(!q.id.includes('-rotation-'))assert.deepEqual(letters,[...'ABCD'].filter((_,i)=>String(i)!==q.correct));
    assert.match(q.explanation,/Referência · Guia Por Dentro da B3, p\. 11, título/);
  }
  const {data:next}=await c('/attempts','POST',{quizId});
  assert.equal(new Set([...attempt.questions,...next.questions].map(q=>q.id)).size,60);
  assert.equal((await c('/attempts','POST',{quizId})).data.id,next.id);
  await c('/attempts/'+next.id+'/finish','POST',{});
  const {data:third}=await c('/attempts','POST',{quizId});
  assert.equal(new Set([...next.questions,...third.questions].map(q=>q.id)).size,60);
});

test('rotação usa o histórico legado, deduplica enunciados e esgota o banco antes de repetir',async t=>{
  const db=seed(),quiz=db.quizzes.find(q=>q.id==='s1');
  const duplicate={...db.questions[0],id:'alternate-id',prompt:db.questions[0].prompt.toUpperCase()};
  const draft={...db.questions[0],id:'draft',prompt:'Pergunta em rascunho',status:'draft'};
  db.questions.push(duplicate,draft);
  quiz.questionIds=['q1','q2'];
  const f=await fixture(t,db),c=f.client(),secondUser=f.client();
  await student(c);
  const {data:old}=await c('/attempts','POST',{quizId:quiz.id});
  await c('/attempts/'+old.id+'/finish','POST',{});
  quiz.questionIds=['q1','q2','q3','q4','alternate-id','draft'];
  quiz.questionsPerAttempt=3;
  const {data:next}=await c('/attempts','POST',{quizId:quiz.id});
  const ids=next.questions.map(q=>q.id);
  assert.equal(ids.length,3);
  assert.deepEqual(ids.slice(0,2).sort(),['q3','q4']);
  assert.ok(['q1','q2'].includes(ids[2]));
  await c('/attempts/'+next.id+'/finish','POST',{});
  await register(secondUser,'rotation@example.test');
  await paid(secondUser);
  const {data:bootstrap}=await secondUser('/bootstrap');
  const visible=bootstrap.quizzes.find(q=>q.id===quiz.id);
  assert.equal(visible.bankCount,4);
  assert.equal(visible.count,3);
});

test('cadastro, unicidade do e-mail, login, logout e senha derivada',async t=>{const f=await fixture(t),c=f.client();assert.equal((await register(c)).status,200);assert.equal(f.db.users[0].password.includes('TesteLocal123!'),false);assert.equal((await register(c)).status,409);await c('/auth/logout','POST',{});assert.equal((await c('/bootstrap')).data.user,null);assert.equal((await c('/auth/login','POST',{email:'aluno@example.test',password:'errada'})).status,401);assert.equal((await c('/auth/login','POST',{email:'aluno@example.test',password:'TesteLocal123!'})).status,200);});
test('conteúdo protegido e compra com valor validado no servidor',async t=>{const f=await fixture(t),c=f.client();assert.equal((await c('/materials/m1')).status,401);await register(c);assert.equal((await c('/materials/m1')).status,403);const o=(await c('/orders','POST',{amount:1})).data;assert.equal(o.amount,2990);assert.equal((await c('/bootstrap')).data.user.hasAccess,false);assert.equal((await c('/materials/m1')).status,403);await c('/orders/'+o.id+'/demo-event','POST',{eventId:'declined',status:'declined'});assert.equal((await c('/bootstrap')).data.user.hasAccess,false);const order=await paid(c);assert.equal((await c('/materials/m1')).status,200);assert.equal((await c('/materials/m3')).status,200);assert.equal((await c('/orders','POST',{})).data.alreadyActive,true);assert.equal(f.db.orders.filter(x=>x.status==='paid').length,1);});
test('eventos de pagamento são idempotentes e não revogam confirmação',async t=>{const f=await fixture(t),c=f.client();await register(c);const o=(await c('/orders','POST',{})).data;for(let i=0;i<2;i++)await c('/orders/'+o.id+'/demo-event','POST',{status:'paid',eventId:'same-event'});await c('/orders/'+o.id+'/demo-event','POST',{status:'pending',eventId:'late-pending'});assert.equal(f.db.orders[0].status,'paid');assert.equal(f.db.paymentEvents.filter(e=>e.id==='same-event').length,1);});
test('aluno não vê dados de outra conta nem executa administração',async t=>{const f=await fixture(t),a=f.client(),b=f.client();await register(a,'a@example.test');await paid(a);const at=(await a('/attempts','POST',{quizId:'s1'})).data;const order=(await a('/orders')).data[0];await register(b,'b@example.test');await paid(b);assert.equal((await b('/attempts/'+at.id)).status,404);assert.equal((await b('/orders/'+order.id+'/demo-event','POST',{status:'paid',eventId:'intrusion'})).status,404);assert.equal((await b('/admin')).status,403);assert.equal((await b('/admin/questions/q1','PATCH',{correct:'0'})).status,403);assert.equal((await b('/bootstrap')).data.attempts.length,0);});
test('gabarito permanece no servidor antes de finalizar',async t=>{const f=await fixture(t),c=f.client();await student(c);const bootstrap=(await c('/bootstrap')).data;assert.equal(JSON.stringify(bootstrap).includes('correct'),false);assert.equal(bootstrap.materials.some(m=>m.body!==undefined),false);const a=(await c('/attempts','POST',{quizId:'s1'})).data;assert.equal(a.questions.some(q=>'correct'in q||'explanation'in q),false);assert.equal((await c('/attempts/'+a.id+'/save','POST',{answers:{q1:'7'}})).status,400);});
test('questões em branco entram no denominador e pesos são separados',async t=>{const f=await fixture(t),c=f.client();await student(c);const a=(await c('/attempts','POST',{quizId:'s1'})).data;await c('/attempts/'+a.id+'/save','POST',{answers:{q1:'1',q2:'2',q4:'0'},flags:['q3','q3','forged']});const result=(await c('/attempts/'+a.id+'/finish','POST',{})).data;assert.deepEqual([result.result.correct,result.result.wrong,result.result.blank],[2,1,1]);assert.equal(result.result.accuracy,50);assert.equal(result.result.weightedPercent,40);assert.equal(result.questions[0].correct,'1');assert.deepEqual(result.flags,['q3']);assert.equal((await c('/attempts/'+a.id+'/finish','POST',{})).data.finishedAt,result.finishedAt);assert.equal((await c('/attempts/'+a.id+'/save','POST',{answers:{}})).status,409);});
test('rascunho e revisão são preservados ao retomar; cada nova tentativa é separada',async t=>{const f=await fixture(t),c=f.client();await student(c);const a=(await c('/attempts','POST',{quizId:'s1'})).data;await c('/attempts/'+a.id+'/save','POST',{answers:{q1:'1'},flags:['q2']});const resumed=(await c('/attempts','POST',{quizId:'s1'})).data;assert.equal(resumed.id,a.id);assert.equal(resumed.answers.q1,'1');assert.deepEqual(resumed.flags,['q2']);await c('/attempts/'+a.id+'/finish','POST',{});const next=(await c('/attempts','POST',{quizId:'s1'})).data;assert.notEqual(next.id,a.id);assert.equal((await c('/bootstrap')).data.attempts.length,2);});
test('discursiva pendente não é erro nem aprovação final; correção completa a nota',async t=>{const f=await fixture(t),s=f.client(),m=f.client();await student(s);const a=(await s('/attempts','POST',{quizId:'s2'})).data;await s('/attempts/'+a.id+'/save','POST',{answers:{q1:'1',q4:'1',q5:'Simples: base fixa. Compostos: juros incorporados ao capital.'}});let done=(await s('/attempts/'+a.id+'/finish','POST',{})).data;assert.equal(done.status,'awaiting_review');assert.equal(done.result.approved,null);assert.equal(done.result.wrong,0);assert.equal(done.result.pending,1);await master(m);assert.equal((await m('/admin/grade','POST',{attemptId:a.id,questionId:'q5',points:3,feedback:'Inválido'})).status,400);await m('/admin/grade','POST',{attemptId:a.id,questionId:'q5',points:2,feedback:'Explicação correta.'});done=(await s('/attempts/'+a.id)).data;assert.equal(done.status,'completed');assert.equal(done.result.approved,true);assert.equal(done.result.points,5);assert.equal(done.grades.q5.feedback,'Explicação correta.');});
test('histórico congela questões e regras mesmo após edição ou despublicação',async t=>{const f=await fixture(t),s=f.client(),m=f.client();await student(s);const a=(await s('/attempts','POST',{quizId:'s1'})).data;await master(m);await m('/admin/questions/q1','PATCH',{prompt:'Enunciado novo',correct:'0',points:5});await m('/admin/quizzes/s1','PATCH',{passPercent:100,durationMinutes:60,status:'draft'});await s('/attempts/'+a.id+'/save','POST',{answers:{q1:'1'}});const done=(await s('/attempts/'+a.id+'/finish','POST',{})).data;assert.notEqual(done.questions[0].prompt,'Enunciado novo');assert.equal(done.questions[0].correct,'1');assert.equal(done.questions[0].points,1);assert.equal(done.rules.passPercent,70);assert.equal(done.rules.durationMinutes,10);});
test('cronômetro é aplicado no servidor e não aceita salvar após o prazo',async t=>{const f=await fixture(t),c=f.client();await student(c);const a=(await c('/attempts','POST',{quizId:'s1'})).data;await c('/attempts/'+a.id+'/save','POST',{answers:{q1:'1'}});f.advance(601000);const r=await c('/attempts/'+a.id+'/save','POST',{answers:{q1:'1',q2:'2'}});assert.equal(r.status,409);const done=(await c('/attempts/'+a.id)).data;assert.equal(done.status,'completed');assert.equal(done.result.correct,1);assert.equal(done.elapsedSeconds,600);});
test('perfil master testa sem pagamento e marca tentativas administrativas',async t=>{const f=await fixture(t),c=f.client();await master(c);assert.equal((await c('/bootstrap')).data.user.hasAccess,true);const a=(await c('/attempts','POST',{quizId:'s3'})).data;assert.equal(a.isTest,true);assert.equal((await c('/admin')).status,200);});
test('materiais concluídos, CRUD editorial e publicação',async t=>{const f=await fixture(t),c=f.client();await master(c);const p=(await c('/admin/preparations','POST',{name:'Nova certificação',description:'Teste',status:'published'})).data;assert.equal(p.status,'draft');assert.equal((await c('/admin/preparations/'+p.id,'PATCH',{status:'published'})).status,400);const m=(await c('/admin/materials','POST',{prepId:p.id,title:'Primeiro material',module:'Módulo 1',body:'Texto autoral para validar a edição.',status:'published'})).data;await c('/admin/preparations/'+p.id,'PATCH',{status:'published'});assert.equal((await c('/materials/'+m.id)).status,200);await c('/materials/'+m.id+'/complete','POST',{completed:true});assert.equal((await c('/bootstrap')).data.completed.length,1);await c('/materials/'+m.id+'/complete','POST',{completed:true});assert.equal((await c('/bootstrap')).data.completed.length,1);assert.equal((await c('/admin/materials/'+m.id,'PATCH',{format:'link',body:'javascript:alert(1)'})).status,400);});
test('recuperação local invalida sessões e token usado',async t=>{const f=await fixture(t),c=f.client(),other=f.client();await register(c);const recovery=(await other('/auth/recover','POST',{email:'aluno@example.test'})).data;const token=recovery.resetPath.split('token=')[1];assert.equal((await other('/auth/reset','POST',{token,password:'NovaSenha123!'})).status,200);assert.equal((await c('/bootstrap')).data.user,null);assert.equal((await other('/auth/reset','POST',{token,password:'OutraSenha123!'})).status,400);assert.equal((await c('/auth/login','POST',{email:'aluno@example.test',password:'NovaSenha123!'})).status,200);});
test('recusa requisições de outra origem',async t=>{const f=await fixture(t),c=f.client();assert.equal((await c('/auth/demo','POST',{role:'master'},{origin:'https://outro.exemplo'})).status,403);});

test('desabilitar revisão não revela gabarito e mantém desempenho por assunto correto',async t=>{const f=await fixture(t),m=f.client(),s=f.client();await master(m);await m('/admin/quizzes/s1','PATCH',{review:false});await student(s);const a=(await s('/attempts','POST',{quizId:'s1'})).data;await s('/attempts/'+a.id+'/save','POST',{answers:{q1:'1',q2:'2',q3:'1',q4:'1'}});const result=(await s('/attempts/'+a.id+'/finish','POST',{})).data;assert.equal(result.questions.some(q=>'correct'in q||'explanation'in q),false);assert.equal(result.result.accuracy,100);assert.deepEqual(result.result.subjects.map(x=>x.correct),[3,1]);});

test('conta, pagamento e rascunho sobrevivem ao reinício do servidor local',async t=>{const file=join(tmpdir(),'logos-estudos-test-'+crypto.randomUUID()+'.json');t.after(()=>{if(existsSync(file))unlinkSync(file);if(existsSync(file+'.tmp'))unlinkSync(file+'.tmp');});const app=createApp({dataFile:file});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;let cookie='';const c=async(path,method='GET',body)=>{const r=await fetch(base+'/api'+path,{method,headers:{cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};try{await register(c);await paid(c);const a=(await c('/attempts','POST',{quizId:'s1'})).data;assert.equal((await c('/attempts/'+a.id+'/save','POST',{answers:{q1:'1'},flags:['q2']})).status,200);const reopened=createApp({dataFile:file});assert.equal(reopened.db.users.length,1);assert.equal(reopened.db.orders[0].status,'paid');assert.equal(reopened.db.attempts[0].answers.q1,'1');assert.deepEqual(reopened.db.attempts[0].flags,['q2']);}finally{await new Promise(r=>app.server.close(r));}});
