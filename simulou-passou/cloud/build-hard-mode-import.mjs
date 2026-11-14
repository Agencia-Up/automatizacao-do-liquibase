import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {independentCertifications} from './independent-certifications.mjs';
import {pqoCatalog} from '../pqo-catalog.mjs';

const pqo=pqoCatalog();
const certifications=independentCertifications();
const incoming={
  quizzes:[...pqo.quizzes,...certifications.map(({quiz})=>quiz)],
  questions:[...pqo.questions,...certifications.flatMap(({questions})=>questions)],
};
const payload=JSON.stringify(incoming);
if(payload.includes('$hard$'))throw new Error('Delimitador de SQL não permitido no catálogo.');
if(new Set(incoming.quizzes.map(item=>item.id)).size!==incoming.quizzes.length)throw new Error('IDs de simulados duplicados.');
if(new Set(incoming.questions.map(item=>item.id)).size!==incoming.questions.length)throw new Error('IDs de questões duplicados.');
const known=new Set(incoming.questions.map(item=>item.id));
for(const quiz of incoming.quizzes)for(const id of quiz.questionIds)if(!known.has(id))throw new Error(`Questão ${id} ausente no pacote de ${quiz.id}.`);

const sql=`
do $import$
declare
  incoming constant jsonb := $hard$${payload}$hard$::jsonb;
  current_body jsonb;
  original jsonb;
begin
  select body into current_body from simulou_passou_private.catalog where id for update;
  if current_body is null then raise exception 'Catálogo do Simulou Passou não encontrado.'; end if;
  original := current_body;
  if exists (
    select 1 from jsonb_array_elements(incoming->'quizzes') target
    where not exists(select 1 from jsonb_array_elements(current_body->'quizzes') current where current->>'id'=target->>'id')
  ) then raise exception 'Um dos simulados que seriam atualizados não existe no catálogo atual.'; end if;

  current_body := jsonb_set(current_body,'{questions}',(
    with target_quizzes as (
      select quiz from jsonb_array_elements(incoming->'quizzes') quiz
    ), old_ids as (
      select distinct id.value as id
      from jsonb_array_elements(current_body->'quizzes') quiz
      join target_quizzes target on target.quiz->>'id'=quiz->>'id'
      cross join lateral jsonb_array_elements_text(quiz->'questionIds') id(value)
    ), shared_ids as (
      select distinct id.value as id
      from jsonb_array_elements(current_body->'quizzes') quiz
      cross join lateral jsonb_array_elements_text(quiz->'questionIds') id(value)
      where not exists(select 1 from target_quizzes target where target.quiz->>'id'=quiz->>'id')
    ), incoming_ids as (
      select question->>'id' as id from jsonb_array_elements(incoming->'questions') question
    ), merged as (
      select question,ordinal::bigint as ordinal
      from jsonb_array_elements(current_body->'questions') with ordinality old(question,ordinal)
      where not exists(select 1 from incoming_ids where incoming_ids.id=question->>'id')
        and (not exists(select 1 from old_ids where old_ids.id=question->>'id')
          or exists(select 1 from shared_ids where shared_ids.id=question->>'id'))
      union all
      select question,1000000+ordinal::bigint
      from jsonb_array_elements(incoming->'questions') with ordinality fresh(question,ordinal)
    )
    select coalesce(jsonb_agg(question order by ordinal),'[]'::jsonb) from merged
  ));

  current_body := jsonb_set(current_body,'{quizzes}',(
    with targets as (select quiz from jsonb_array_elements(incoming->'quizzes') quiz)
    select jsonb_agg(coalesce((select target.quiz from targets target where target.quiz->>'id'=current.quiz->>'id'),current.quiz) order by ordinal)
    from jsonb_array_elements(current_body->'quizzes') with ordinality current(quiz,ordinal)
  ));

  if exists (
    select 1 from jsonb_array_elements(incoming->'quizzes') quiz
    cross join lateral jsonb_array_elements_text(quiz->'questionIds') ref(id)
    where not exists(select 1 from jsonb_array_elements(current_body->'questions') question where question->>'id'=ref.id and question->>'prepId'=quiz->>'prepId')
  ) then raise exception 'O pacote final contém referência para questão ausente ou de outro módulo.'; end if;

  update simulou_passou_private.catalog
  set body=current_body,revision=revision+1,updated_at=now()
  where id and original is distinct from current_body;
end $import$;
`;

const output=resolve(dirname(fileURLToPath(import.meta.url)),'../dist/hard-mode-import.sql');
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,sql);
console.log('Pacote transacional do modo difícil gerado em',output);
console.log('Simulados:',incoming.quizzes.length,'Questões:',incoming.questions.length);
