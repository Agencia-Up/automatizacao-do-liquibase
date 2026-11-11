import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pqoCatalog, archivedExamples } from '../pqo-catalog.mjs';

const track=process.argv[2];
const full=pqoCatalog(),practice=pqoCatalog({practice:true});
const selected=track?full.quizzes.find(q=>q.prepId===track&&q.durationMinutes===180):null;
if(track&&!selected)throw new Error('Informe o ID de uma preparação PQO com simulado de certificação ou recertificação.');
const output = resolve(dirname(fileURLToPath(import.meta.url)), track?'../dist/pqo-upgrade-'+track+'.sql':'../dist/pqo-import.sql');
const select=(key,records)=>track?records.filter(item=>(key==='preparations'?item.id:item.prepId)===track):records;
const existingIds=new Set(practice.questions.map(q=>q.id));
const newTrack=track&&!practice.preparations.some(preparation=>preparation.id===track);
const upgrade={
  preparations:select('preparations',full.preparations),
  quizzes:select('quizzes',full.quizzes),
  questions:select('questions',full.questions).filter(q=>!existingIds.has(q.id)),
  ...(newTrack?{materials:select('materials',full.materials)}:{}),
};
const payload = JSON.stringify(track?upgrade:full);
const previous = JSON.stringify(Object.fromEntries(Object.entries(practice).filter(([key])=>['quizzes','preparations'].includes(key)).map(([key,items])=>[key,select(key,items)])));
const archive = JSON.stringify(track?{}:archivedExamples);
if ([payload,previous,archive].some(text=>text.includes('$pqo$'))) throw new Error('Delimitador de SQL não permitido no catálogo.');

const guardBefore=newTrack?`
  if exists (
    select 1 from jsonb_array_elements(current_body->'quizzes') q
    where q->>'id'=incoming->'quizzes'->0->>'id' and q<>incoming->'quizzes'->0
  ) then raise exception 'Já existe um simulado diferente com este ID.'; end if;`:track?`
  if not exists (
    select 1 from jsonb_array_elements(current_body->'quizzes') q
    where q in (incoming->'quizzes'->0,previous_catalog->'quizzes'->0)
  ) then raise exception 'O simulado atual foi editado ou ainda não foi importado.'; end if;`:'';
const guardAfter=track?`
  if exists (
    select 1 from jsonb_array_elements_text(incoming->'quizzes'->0->'questionIds') id_ref
    where not exists(select 1 from jsonb_array_elements(current_body->'questions') q where q->>'id'=id_ref and q->>'prepId'=incoming->'quizzes'->0->>'prepId')
  ) then raise exception 'O banco da trilha está incompleto.'; end if;`:'';

const sql = `
do $import$
declare
  incoming constant jsonb := $pqo$${payload}$pqo$::jsonb;
  previous_catalog constant jsonb := $pqo$${previous}$pqo$::jsonb;
  archive constant jsonb := $pqo$${archive}$pqo$::jsonb;
  current_body jsonb;
  original jsonb;
  collection text;
  item jsonb;
  matches boolean;
  previous_item jsonb;
begin
  select body into current_body from simulou_passou_private.catalog where id for update;
  original := current_body;
  ${guardBefore}
  for collection, item in
    select catalog.key, entry.value from jsonb_each(incoming) catalog
    cross join lateral jsonb_array_elements(catalog.value) entry
  loop
    select exists(select 1 from jsonb_array_elements(current_body->collection) existing where existing->>'id'=item->>'id') into matches;
    if not matches then
      current_body := jsonb_set(current_body,array[collection],(current_body->collection)||item);
    elsif collection in ('quizzes','preparations') then
      select previous_record into previous_item
      from jsonb_array_elements(previous_catalog->collection) previous_record
      where previous_record->>'id'=item->>'id';
      current_body := jsonb_set(current_body,array[collection],(
        select jsonb_agg(case
          when existing=previous_item then item
          when collection='preparations' and item->>'id'='pqo' and existing->>'id'='pqo' and existing->>'track' is null then existing||item
          else existing end order by ordinal)
        from jsonb_array_elements(current_body->collection) with ordinality old(existing,ordinal)
      ));
    end if;
  end loop;
  ${guardAfter}
  for collection, item in
    select examples.key, entry.value from jsonb_each(archive) examples
    cross join lateral jsonb_array_elements(examples.value) entry
  loop
    current_body := jsonb_set(current_body,array[collection],(
      select jsonb_agg(case when old.entry->>'id'=item->>0 and old.entry->>(item->>1)=item->>2
        then old.entry||'{"status":"draft"}'::jsonb else old.entry end order by ordinal)
      from jsonb_array_elements(current_body->collection) with ordinality old(entry,ordinal)
    ));
  end loop;
  update simulou_passou_private.catalog set body=current_body, revision=revision+1, updated_at=now()
  where id and original is distinct from current_body;
end $import$;
`;
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, sql);
console.log('Importação idempotente do catálogo gerada em', output);
