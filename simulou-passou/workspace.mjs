import {uid} from './seed.mjs';

export function createWorkspace({db,now,stamp,persist,needUser,needAccess,access,viewAttempt}) {
  for(const key of ['notes','studyTasks','studyPreferences','reviewMarks','focusSessions'])db[key]??=[];
  const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
  const text=(value,max=10000)=>String(value??'').trim().slice(0,max);
  const day=value=>{if(!value)return '';const s=String(value);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00:00Z'))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)fail(400,'Informe uma data válida.');return s;};
  function prep(id){if(id&&!db.preparations.some(p=>p.id===id))fail(400,'Preparação não encontrada.');return id||'';}
  function attemptQuestion(user,attemptId,questionId){const a=db.attempts.find(a=>a.id===attemptId&&a.userId===user.id);if(!a)fail(404,'Tentativa não encontrada.');viewAttempt(a);if(a.status==='in_progress'||!a.rules.review)fail(403,'A revisão desta tentativa não está disponível.');const q=a.questions.find(q=>q.id===questionId);if(!q)fail(404,'Questão não encontrada.');return {a,q};}
  function reviewItems(user){if(!access(user))return [];const items=[];for(const a of db.attempts.filter(a=>a.userId===user.id)){viewAttempt(a);if(a.status==='in_progress'||!a.rules.review)continue;for(const q of a.questions){if(q.type!=='objective'||a.answers[q.id]===q.correct)continue;const mark=db.reviewMarks.find(m=>m.userId===user.id&&m.attemptId===a.id&&m.questionId===q.id);items.push({id:a.id+':'+q.id,attemptId:a.id,quizId:a.quizId,quizName:a.quizName,prepId:a.prepId,questionId:q.id,subject:q.subject,prompt:q.prompt,options:q.options,answer:a.answers[q.id]??null,correct:q.correct,explanation:q.explanation,finishedAt:a.finishedAt,reviewedAt:mark?.reviewedAt||null});}}return items.sort((a,b)=>String(b.finishedAt).localeCompare(String(a.finishedAt)));}
  return function workspace(req,path,method,b){
    if(path!=='/api/workspace'&&!path.startsWith('/api/workspace/'))return null;
    const user=needUser(req);let result;
    if(path==='/api/workspace'&&method==='GET'){
      result={notes:db.notes.filter(n=>n.userId===user.id),tasks:db.studyTasks.filter(t=>t.userId===user.id),preferences:db.studyPreferences.find(p=>p.userId===user.id)||{userId:user.id,prepId:'',examDate:'',weeklyGoal:3},reviewItems:reviewItems(user),focusSessions:db.focusSessions.filter(s=>s.userId===user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100),hasAccess:access(user)};
    }else if(path==='/api/workspace/preferences'&&method==='PATCH'){
      const weeklyGoal=Number(b.weeklyGoal);if(!Number.isInteger(weeklyGoal)||weeklyGoal<1||weeklyGoal>30)fail(400,'Escolha uma meta de 1 a 30 simulações por semana.');
      const item={userId:user.id,prepId:prep(b.prepId),examDate:day(b.examDate),weeklyGoal,updatedAt:stamp()};db.studyPreferences=db.studyPreferences.filter(p=>p.userId!==user.id);db.studyPreferences.push(item);persist();result=item;
    }else if(/^\/api\/workspace\/notes(\/[^/]+)?$/.test(path)&&['POST','PATCH','DELETE'].includes(method)){
      const id=path.split('/')[4],existing=id?db.notes.find(n=>n.id===id&&n.userId===user.id):null;if(id&&!existing)fail(404,'Anotação não encontrada.');
      if(method==='DELETE'){if(!id)fail(400,'Escolha uma anotação.');db.notes=db.notes.filter(n=>n!==existing);persist();result={ok:true};}
      else{if(method==='PATCH'&&!existing)fail(404,'Anotação não encontrada.');const input={...existing,...b};if(input.sourceAttemptId||input.sourceQuestionId){needAccess(req);attemptQuestion(user,input.sourceAttemptId,input.sourceQuestionId);}
        const body=text(input.body,30000),title=text(input.title,160)||'Anotação sem título';if(!body)fail(400,'Escreva um conteúdo para salvar sua anotação.');
        const note={id:existing?.id||uid(),userId:user.id,title,body,prepId:prep(input.prepId),favorite:!!input.favorite,sourceAttemptId:input.sourceAttemptId||null,sourceQuestionId:input.sourceQuestionId||null,createdAt:existing?.createdAt||stamp(),updatedAt:stamp()};
        if(existing)db.notes[db.notes.indexOf(existing)]=note;else db.notes.push(note);persist();result=note;}
    }else if(/^\/api\/workspace\/tasks(\/[^/]+)?$/.test(path)&&['POST','PATCH','DELETE'].includes(method)){
      const id=path.split('/')[4],existing=id?db.studyTasks.find(t=>t.id===id&&t.userId===user.id):null;if(id&&!existing)fail(404,'Atividade não encontrada.');
      if(method==='DELETE'){if(!id)fail(400,'Escolha uma atividade.');db.studyTasks=db.studyTasks.filter(t=>t!==existing);persist();result={ok:true};}
      else{if(method==='PATCH'&&!existing)fail(404,'Atividade não encontrada.');const input={...existing,...b};const title=text(input.title,180);if(!title)fail(400,'Dê um título à atividade.');const dueDate=day(input.dueDate);if(!dueDate)fail(400,'Escolha a data da atividade.');const kind=['simulation','review','material','free'].includes(input.kind)?input.kind:'free';let quizId=input.quizId||'';if(quizId&&!db.quizzes.some(q=>q.id===quizId&&q.status==='published'&&(!input.prepId||q.prepId===input.prepId)))fail(400,'Escolha um simulado publicado da preparação selecionada.');if(kind!=='simulation')quizId='';const item={id:existing?.id||uid(),userId:user.id,title,dueDate,kind,prepId:prep(input.prepId),quizId,completed:!!input.completed,createdAt:existing?.createdAt||stamp(),updatedAt:stamp()};if(existing)db.studyTasks[db.studyTasks.indexOf(existing)]=item;else db.studyTasks.push(item);persist();result=item;}
    }else if(path==='/api/workspace/review'&&method==='POST'){
      needAccess(req);const {a,q}=attemptQuestion(user,b.attemptId,b.questionId);if(q.type!=='objective'||a.answers[q.id]===q.correct)fail(400,'Esta questão não é um erro ou uma questão em branco da sua tentativa.');db.reviewMarks=db.reviewMarks.filter(m=>!(m.userId===user.id&&m.attemptId===a.id&&m.questionId===q.id));if(b.reviewed)db.reviewMarks.push({userId:user.id,attemptId:a.id,questionId:q.id,reviewedAt:stamp()});persist();result={ok:true};
    }else if(path==='/api/workspace/focus'&&method==='POST'){
      const eventId=text(b.eventId,100);if(!eventId)fail(400,'Identificador do bloco ausente.');const existing=db.focusSessions.find(s=>s.userId===user.id&&s.eventId===eventId);if(existing)return {handled:true,data:existing};const minutes=Number(b.minutes);if(!Number.isInteger(minutes)||minutes<1||minutes>180)fail(400,'Registre de 1 a 180 minutos por bloco.');const startedAt=String(b.startedAt||'');if(!Number.isFinite(Date.parse(startedAt))||Date.parse(startedAt)>now())fail(400,'Horário inicial inválido.');const item={id:uid(),userId:user.id,eventId,minutes,topic:text(b.topic,160)||'Prática e revisão',startedAt,createdAt:stamp(),selfReported:true};db.focusSessions.push(item);persist();result=item;
    }else fail(404,'Ferramenta pessoal não encontrada.');
    return {handled:true,data:result};
  };
}
