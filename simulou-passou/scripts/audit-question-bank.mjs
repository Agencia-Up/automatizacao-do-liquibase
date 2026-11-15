import {independentCertifications} from '../cloud/independent-certifications.mjs';
import {pqoCatalog} from '../pqo-catalog.mjs';
import {questionsAreSimilar} from '../question-quality.mjs';

const stopWords=new Set('a o as os um uma uns umas de da do das dos e em no na nos nas por para com sem que qual quais como se ao aos ou seu sua seus suas esse essa isso deste desta entre sobre mais menos'.split(' '));
const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const templateCache=new Map(),tokenCache=new Map();
const template=value=>{
  const source=String(value??'');
  if(templateCache.has(source))return templateCache.get(source);
  const result=fold(source).replace(/r\$\s*[\d.,]+|\b\d+(?:[.,]\d+)?%?|\b(?:usd|brl)\b/g,' # ')
    .replace(/[^a-z0-9#]+/g,' ').replace(/\s+/g,' ').trim();
  templateCache.set(source,result);
  return result;
};
const tokens=value=>{
  const key=template(value);
  if(!tokenCache.has(key))tokenCache.set(key,new Set(key.split(' ').filter(token=>token.length>2&&!stopWords.has(token))));
  return tokenCache.get(key);
};
const similarity=(left,right)=>{
  const a=tokens(left),b=tokens(right);
  if(a.size<4||b.size<4)return 0;
  let intersection=0;
  for(const token of a)if(b.has(token))intersection++;
  return intersection/(a.size+b.size-intersection);
};

const pqo=pqoCatalog();
const independent=independentCertifications();
const questions=[...pqo.questions,...independent.flatMap(exam=>exam.questions)];
const quizzes=[...pqo.quizzes,...independent.map(exam=>exam.quiz)];
const byId=new Map(questions.map(question=>[question.id,question]));
const absolute=/\b(sempre|nunca|qualquer|automaticamente|exclusivamente|somente|garante|elimina toda|dispensa)\b/i;
const answerLeak=/\b(?:no CAPM|alíquota (?:efetiva )?de\s*\d|por juros (?:simples|compostos)|use a aproximação de primeira ordem|a taxa aplicável é|é isent[oa] porque|incide[m]? \d+(?:[.,]\d+)?%)\b/i;
const directRecall=/^(?:qual|que|quem|em qual)\b/i;
const adjacentDuplicateSentence=value=>{
  const sentences=String(value).match(/[^.!?]+[.!?]+/g)?.map(sentence=>sentence.trim().toLocaleLowerCase('pt-BR'))||[];
  return sentences.some((sentence,index)=>index>0&&sentence===sentences[index-1]);
};
const reports=[];
const compatibleCount=questions=>{
  const adjacency=new Map(questions.map(question=>[question,new Set()]));
  for(let i=0;i<questions.length;i++)for(let j=i+1;j<questions.length;j++)if(questionsAreSimilar(questions[i],questions[j])){
    adjacency.get(questions[i]).add(questions[j]);
    adjacency.get(questions[j]).add(questions[i]);
  }
  const remaining=new Set(questions);
  let count=0;
  while(remaining.size){
    let selected=null,degree=Infinity;
    for(const candidate of remaining){
      let current=0;
      for(const other of adjacency.get(candidate))if(remaining.has(other))current++;
      if(current<degree){selected=candidate;degree=current;}
    }
    count++;
    remaining.delete(selected);
    for(const other of adjacency.get(selected))remaining.delete(other);
  }
  return count;
};

for(const quiz of quizzes){
  const pool=quiz.questionIds.map(id=>byId.get(id)).filter(Boolean);
  const exactTemplates=new Map();
  for(const question of pool){
    const key=template(question.prompt);
    exactTemplates.set(key,[...(exactTemplates.get(key)||[]),question.id]);
  }
  const similar=[];
  for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){
    const score=similarity(pool[i].prompt,pool[j].prompt);
    if(score>=0.58)similar.push({score:Number(score.toFixed(3)),left:pool[i].id,right:pool[j].id,leftPrompt:pool[i].prompt,rightPrompt:pool[j].prompt});
  }
  similar.sort((a,b)=>b.score-a.score);
  const weakDistractors=pool.filter(question=>question.type==='objective'&&question.options.some((option,index)=>index!==Number(question.correct)&&absolute.test(option)));
  const answerLeaks=pool.filter(question=>answerLeak.test(`${question.context||''} ${question.prompt}`));
  const directRecallQuestions=pool.filter(question=>question.type==='objective'&&directRecall.test(question.prompt.trim())&&`${question.context||''} ${question.prompt}`.length<220);
  const duplicatedScaffolding=pool.filter(question=>adjacentDuplicateSentence(`${question.context||''} ${question.prompt}`));
  const promptLengths=pool.map(question=>question.prompt.length).sort((a,b)=>a-b);
  const groupCoverage=Object.entries(quiz.subjectCounts||{}).map(([group,required])=>{
    const groupQuestions=pool.filter(question=>(question.selectionGroup||question.subject)===group);
    return {group,required,bank:groupQuestions.length,uniqueTemplates:new Set(groupQuestions.map(question=>template(question.prompt))).size,compatibleCount:compatibleCount(groupQuestions)};
  });
  reports.push({
    quizId:quiz.id,
    name:quiz.name,
    bankCount:pool.length,
    drawCount:quiz.questionsPerAttempt??pool.length,
    medianPromptLength:promptLengths[Math.floor(promptLengths.length/2)]||0,
    exactTemplateGroups:[...exactTemplates.entries()].filter(([,ids])=>ids.length>1).map(([key,ids])=>({key,ids})),
    similarPairs:similar.slice(0,20),
    similarPairCount:similar.length,
    weakDistractorQuestionCount:weakDistractors.length,
    answerLeakQuestionCount:answerLeaks.length,
    directRecallQuestionCount:directRecallQuestions.length,
    duplicatedScaffoldingQuestionCount:duplicatedScaffolding.length,
    advancedShare:Number((pool.filter(question=>question.difficulty==='advanced').length/Math.max(pool.length,1)).toFixed(3)),
    applicationShare:Number((pool.filter(question=>question.cognitiveLevel==='application').length/Math.max(pool.length,1)).toFixed(3)),
    missingDifficulty:pool.filter(question=>!question.difficulty).length,
    compatibleCount:compatibleCount(pool),
    groupCoverage,
  });
}

console.log(JSON.stringify({questionCount:questions.length,quizCount:quizzes.length,reports},null,2));
