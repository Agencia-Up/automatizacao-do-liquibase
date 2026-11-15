import {test} from 'node:test';
import assert from 'node:assert/strict';
import {independentCertifications} from '../cloud/independent-certifications.mjs';
import {pqoCatalog} from '../pqo-catalog.mjs';

const displayed=question=>`${question.context||''} ${question.prompt}`.trim();
const adjacentDuplicateSentence=value=>{
  const sentences=String(value).match(/[^.!?]+[.!?]+/g)?.map(sentence=>sentence.trim().toLocaleLowerCase('pt-BR'))||[];
  return sentences.some((sentence,index)=>index>0&&sentence===sentences[index-1]);
};
const leaks=[
  /\bNo CAPM\b/i,
  /\balíquota (?:efetiva )?de\s*\d/i,
  /\b(?:por|com) juros (?:simples|compostos)\b/i,
  /\bcalcule os juros simples\b/i,
  /\bcom capitalização composta\b/i,
  /\buse a aproximação de primeira ordem\b/i,
  /\bé isent[oa] porque\b/i,
  /\bincide[m]? \d+(?:[.,]\d+)?%\b/i,
];

test('banco exige aplicação sem entregar fórmula, alíquota ou enquadramento no enunciado',()=>{
  const questions=[...pqoCatalog().questions,...independentCertifications().flatMap(exam=>exam.questions)];
  const leaking=questions.filter(question=>leaks.some(pattern=>pattern.test(displayed(question))));
  assert.deepEqual(leaking.map(question=>({id:question.id,text:displayed(question)})),[]);
  assert.ok(questions.every(question=>question.cognitiveLevel&&question.difficulty));
});

test('enunciado tem uma única voz, uma única pergunta e pontuação válida',()=>{
  const questions=[...pqoCatalog().questions,...independentCertifications().flatMap(exam=>exam.questions)];
  const synthetic=/^(Durante a conferência|Antes de liberar|Na revisão de uma operação|Um parecer interno|Na preparação do extrato|A área de controles|Durante uma reunião de risco|Uma pessoa cliente|No teste de consistência|A supervisão devolveu|Antes de executar|O relatório mensal|Em uma checagem independente|A mesa recebeu|Uma revisão por amostragem|O responsável pela conciliação|Na passagem de turno|A decisão será registrada)/;
  const broken=questions.filter(question=>/\?\s*\./.test(question.prompt)||(question.prompt.match(/\?/g)||[]).length>1||synthetic.test(question.prompt));
  assert.deepEqual(broken.map(question=>({id:question.id,text:question.prompt})),[]);
});

test('ambientação não é duplicada nem adicionada a perguntas conceituais sem caso',()=>{
  const questions=[...pqoCatalog().questions,...independentCertifications().flatMap(exam=>exam.questions)];
  const duplicated=questions.filter(question=>adjacentDuplicateSentence(displayed(question)));
  assert.deepEqual(duplicated.map(question=>({id:question.id,text:displayed(question)})),[]);
  const bankQuestion=questions.find(question=>question.prompt.includes('Na comparação entre banco comercial e intermediário de bolsa'));
  assert.ok(bankQuestion,'questão de instituições e intermediários não encontrada');
  assert.match(bankQuestion.prompt,/^Na comparação entre banco comercial e intermediário de bolsa/);
});

test('todos os simulados usam o conjunto padrão de ferramentas de prova',()=>{
  const quizzes=[...pqoCatalog().quizzes,...independentCertifications().map(exam=>exam.quiz)];
  assert.ok(quizzes.length>=13);
  assert.ok(quizzes.every(quiz=>quiz.review===true),`revisão ausente em: ${quizzes.filter(quiz=>quiz.review!==true).map(quiz=>quiz.id).join(', ')}`);
  assert.ok(quizzes.every(quiz=>quiz.calculator===true),`HP 12C ausente em: ${quizzes.filter(quiz=>quiz.calculator!==true).map(quiz=>quiz.id).join(', ')}`);
});

test('banco ANBIMA inclui bloco autoral avançado inspirado no padrão oficial',()=>{
  const exams=independentCertifications().filter(exam=>['cpa-certificacao','c-pro-r-certificacao','c-pro-i-certificacao'].includes(exam.quiz.id));
  for(const exam of exams){
    const editorial=exam.questions.filter(question=>question.editorialStandard==='anbima-2026');
    assert.ok(editorial.length>=8,`${exam.quiz.id} tem apenas ${editorial.length} questões no padrão editorial`);
    assert.ok(editorial.every(question=>question.context?.length>=100),`${exam.quiz.id} contém caso sem contexto suficiente`);
    assert.ok(editorial.every(question=>question.difficulty==='advanced'&&question.cognitiveLevel==='application'));
    assert.ok(editorial.every(question=>question.options.length===4&&new Set(question.options).size===4));
  }
});

test('casos tributários escondem a regra e preservam gabarito verificável',()=>{
  const questions=independentCertifications().flatMap(exam=>exam.questions);
  const cases=questions.filter(question=>/vendeu ações por R\$ 32\.000|cotas de ETF de renda variável por R\$ 18\.000|mesmo pregão a mesma quantidade de ações/i.test(question.context||question.prompt));
  assert.ok(cases.length>=6);
  const forbidden=/\b(?:alíquota|isento|isenção|tributável|day trade|15%|20%|limite de R\$ 20\.000)\b/i;
  for(const question of cases){
    assert.doesNotMatch(displayed(question),forbidden,question.id);
    assert.equal(new Set(question.options).size,4,question.id);
    assert.match(question.options[Number(question.correct)],/^R\$\s/);
  }
  const sale=cases.find(question=>/vendeu ações por R\$ 32\.000/i.test(question.context||question.prompt));
  assert.equal(sale.options[Number(sale.correct)],'R$ 1.078,40.');
  const pqoSale=pqoCatalog().questions.find(question=>question.id==='pqo-operacoes-q11');
  assert.doesNotMatch(displayed(pqoSale),forbidden,pqoSale.id);
  assert.equal(pqoSale.options[Number(pqoSale.correct)],'R$ 1.100.');
});

test('gabaritos numéricos usam os dados exibidos e o sentido correto da variação',()=>{
  const exams=independentCertifications();
  const questions=exams.flatMap(exam=>exam.questions);
  const answer=q=>q.options[Number(q.correct)];
  const checks=[
    [/taxa nominal de 12,36%/, '7,70%.'],
    [/paga R\$ 40\.000 em 6 meses/, 'R$ 95.394,44.'],
    [/preço relativo da cesta estrangeira/, 'Caiu cerca de 0,9%.'],
  ];
  for(const [pattern,expected] of checks){
    const question=questions.find(q=>pattern.test(q.prompt));
    assert.ok(question,pattern.source);
    assert.equal(answer(question),expected);
  }
  const costOfEquity=questions.filter(q=>q.prompt.includes('o beta da ação é'));
  assert.equal(costOfEquity.length,15);
  for(const q of costOfEquity){
    const [,riskFree,premium,beta]=q.prompt.match(/risco é (\d+)%.*mercado é (\d+)%.*ação é (\d+,\d+)/);
    const expected=Math.round((Number(riskFree)+Number(premium)*Number(beta.replace(',','.')))*100);
    assert.equal(Math.round(Number(answer(q).replace(',','.').replace('%',''))*100),expected,q.id);
  }
  const losses=questions.filter(q=>q.prompt.includes('qual é o valor estimado da perda?'));
  assert.equal(losses.length,10);
  for(const q of losses){
    assert.equal((q.prompt.match(/pontos-base/g)||[]).length,1,q.id);
    assert.doesNotMatch(q.prompt,/subirem[^?]*em paralelo\./);
  }
});
