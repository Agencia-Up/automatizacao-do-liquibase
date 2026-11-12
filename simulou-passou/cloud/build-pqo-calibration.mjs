import {mkdirSync,writeFileSync} from 'node:fs';
import {pqoCatalog} from '../pqo-catalog.mjs';

const {questions,quizzes}=pqoCatalog();
const exams=quizzes.filter(exam=>exam.durationMinutes===180);
const ids=new Set(exams.flatMap(exam=>exam.questionIds));
const known=new Set((process.argv[2]||'').split(',').filter(Boolean));
const payload=JSON.stringify({
  questions:questions.filter(question=>ids.has(question.id)&&!known.has(question.id)),
  quizzes:exams.map(({id,prepId,questionIds})=>({id,prepId,questionIds})),
});
if(payload.includes('$pqo$'))throw new Error('Delimitador inválido no catálogo.');

const sql=`
do $calibration$
declare incoming constant jsonb := $pqo$${payload}$pqo$;
  current_body jsonb;
  original jsonb;
begin
  select body into current_body from simulou_passou_private.catalog where id for update;
  original := current_body;
  current_body := jsonb_set(current_body,'{questions}',current_body->'questions'||coalesce((
    select jsonb_agg(q) from jsonb_array_elements(incoming->'questions') q
    where not exists(select 1 from jsonb_array_elements(current_body->'questions') old where old->>'id'=q->>'id')
  ),'[]'::jsonb));
  if exists (
    select 1 from jsonb_array_elements(incoming->'quizzes') exam
    cross join lateral jsonb_array_elements_text(exam->'questionIds') ref(id)
    where not exists(select 1 from jsonb_array_elements(current_body->'questions') q
      where q->>'id'=ref.id and q->>'prepId'=exam->>'prepId' and q->>'type'='objective' and q->>'status'='published')
  ) then raise exception 'O banco calibrado contém uma questão ausente ou de outra trilha.'; end if;
  current_body := jsonb_set(current_body,'{quizzes}',(
    select jsonb_agg(case when incoming_exam is null then current_exam
      else jsonb_set(current_exam,'{questionIds}',incoming_exam->'questionIds') end order by position)
    from jsonb_array_elements(current_body->'quizzes') with ordinality old(current_exam,position)
    left join lateral (
      select value as incoming_exam from jsonb_array_elements(incoming->'quizzes')
      where value->>'id'=current_exam->>'id' and value->>'prepId'=current_exam->>'prepId'
    ) updated on true
  ));
  update simulou_passou_private.catalog set body=current_body,revision=revision+1,updated_at=now()
  where id and original is distinct from current_body;
end $calibration$;
`;
mkdirSync(new URL('../dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('../dist/pqo-calibration.sql',import.meta.url),sql);
