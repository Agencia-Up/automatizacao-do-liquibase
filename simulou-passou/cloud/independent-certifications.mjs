import {createHash} from 'node:crypto';
import {certificationSpecs} from '../certification-specs.mjs';
import {ancordItems} from '../ancord-bank.mjs';
import {anbimaItems} from '../anbima-bank.mjs';

const preparationIds={ancord:'ancord',cpa:'proxima','c-pro-r':'pqo-comercial','c-pro-i':'pqo-compliance'};
const replacedQuizzes={ancord:['s1','s2'],cpa:[],'c-pro-r':['pqo-treino-comercial'],'c-pro-i':['pqo-treino-compliance']};
const groupsFor=(cert,module,subject,format)=>{
  if(cert==='ancord')return subject;
  if(cert==='cpa'&&module===3||cert==='c-pro-r'&&module===1||cert==='c-pro-i'&&module===4)
    return subject+(format==='dialogue'?' · Diálogo':' · Demais questões');
  if(cert==='cpa'&&module===2||cert==='c-pro-r'&&module===2||cert==='c-pro-i'&&module===1)
    return subject+(format==='case'?' · Caso':' · Demais questões');
  return subject;
};
const cryptoKey=text=>createHash('sha256').update(text).digest('hex');
const describedFormat={objective:'Múltipla escolha',case:'Caso',dialogue:'Árvore de diálogo'};

function buildQuestion(cert,prepId,row){
  const format=row.format||'objective';
  const prompt=row.context&&format==='dialogue'&&!row.prompt.includes(row.context)
    ?row.prompt+' '+row.context:row.prompt;
  const id=cert+'-questao-'+cryptoKey(prompt).slice(0,20);
  const common={id,prepId,subject:row.subject,selectionGroup:groupsFor(cert,Number(row.module),row.subject,format),
    module:row.module,subtopic:row.subtopic||row.subject,format,source:certificationSpecs[cert].source,section:row.section,
    authoredOn:'2026-11-13',status:'published',points:1,prompt};
  if(format==='dialogue'){
    const nodes=Object.fromEntries(Object.entries(row.nodes).map(([key,node])=>[key,{
      ...node,choices:[...node.choices].sort((a,b)=>cryptoKey(id+a.text).localeCompare(cryptoKey(id+b.text))),
    }]));
    return {...common,type:'dialogue',dialogue:{start:row.start,nodes}};
  }
  const correct=cert==='ancord'?row.correct:row.options[row.correct];
  const other=cert==='ancord'?row.other:row.options.filter((_,i)=>i!==row.correct);
  const options=[correct,...other].sort((a,b)=>cryptoKey(id+a).localeCompare(cryptoKey(id+b)));
  const comment=cert==='ancord'?row.explanation:row.feedback[row.correct];
  const distractors=options.flatMap((option,i)=>{
    if(option===correct)return [];
    const explanation=cert==='ancord'?'A opção não atende ao critério explicado na resposta correta.':row.feedback[row.options.indexOf(option)];
    return [`${'ABCD'[i]} — ${explanation}`];
  });
  return {...common,type:'objective',context:format==='case'?row.context:undefined,options,correct:String(options.indexOf(correct)),
    explanation:[comment,...distractors,`Referência · ${row.section}.`].join(' ')};
}

function composition(cert,spec){
  if(spec.subjectCounts)return spec.subjectCounts;
  const result={};
  Object.entries(spec.moduleProportions).forEach(([subject,pct],index)=>{
    const n=spec.questionsPerAttempt*pct/100;
    const caseModule=cert==='cpa'?1:cert==='c-pro-r'?1:0;
    const dialogueModule=cert==='cpa'?2:cert==='c-pro-r'?0:3;
    if(index===caseModule||index===dialogueModule){
      const type=index===caseModule?'Caso':'Diálogo';
      const formatCount=type==='Caso'?(cert==='cpa'?5:cert==='c-pro-r'?7:6):cert==='c-pro-r'?2:1;
      result[subject+' · '+type]=formatCount;
      result[subject+' · Demais questões']=n-formatCount;
    }else result[subject]=n;
  });
  return result;
}

export function independentCertifications(){
  return Object.entries(certificationSpecs).map(([cert,spec])=>{
    const prepId=preparationIds[cert];
    const rows=cert==='ancord'?ancordItems:anbimaItems.filter(q=>q.certification===cert);
    const questions=rows.map(row=>buildQuestion(cert,prepId,row));
    const subjectCounts=composition(cert,spec);
    if(new Set(questions.map(q=>q.id)).size!==questions.length||questions.some(q=>q.options&&new Set(q.options).size!==4))
      throw Error('Questões duplicadas ou alternativas inválidas em '+cert);
    for(const [subject,n] of Object.entries(subjectCounts)){
      if(questions.filter(q=>q.selectionGroup===subject).length<n)throw Error('Banco insuficiente em '+cert+' · '+subject);
    }
    const mode=spec.formats.map(format=>describedFormat[format]).join(', ');
    const description=`${spec.questionsPerAttempt} questões em 2h30, com mínimo de ${spec.minimumCorrect} acertos${cert==='ancord'?' e aprovação nos quatro eixos obrigatórios':''}. Formatos: ${mode}. Questões autorais com revisão após finalizar.`;
    return {
      prep:{id:prepId,name:spec.name,track:'pqo',certification:cert,status:'published',demo:false,training:false,color:'blue',description,subjects:[...new Set(questions.map(q=>q.subject))]},
      quiz:{id:cert+'-certificacao',prepId,name:spec.name,status:'published',description,questionIds:questions.map(q=>q.id),durationMinutes:150,questionsPerAttempt:spec.questionsPerAttempt,
        passPercent:null,minimumCorrect:spec.minimumCorrect,subjectCounts,subjectMinimums:spec.subjectMinimums,review:true,calculator:cert==='ancord',maxAttempts:null},
      questions,
      material:{id:cert+'-programa-oficial',prepId,module:'Programa oficial',title:cert==='ancord'?'Regulamento ANCORD/FGV':'Programa detalhado da ANBIMA',
        format:'link',body:spec.source,status:'published'},
      replacedQuizzes:replacedQuizzes[cert],
    };
  });
}
