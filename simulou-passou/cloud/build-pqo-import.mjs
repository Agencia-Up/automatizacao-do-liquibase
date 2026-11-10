import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pqoCatalog, archivedExamples } from '../pqo-catalog.mjs';

const output = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/pqo-import.sql');
const payload = JSON.stringify(pqoCatalog());
const archive = JSON.stringify(archivedExamples);
if ([payload,archive].some(text=>text.includes('$pqo$'))) throw new Error('Delimitador de SQL não permitido no catálogo.');

const sql = `
do $import$
declare
  incoming constant jsonb := $pqo$${payload}$pqo$::jsonb;
  archive constant jsonb := $pqo$${archive}$pqo$::jsonb;
  current_body jsonb;
  original jsonb;
  collection text;
  item jsonb;
  matches boolean;
begin
  select body into current_body from simulou_passou_private.catalog where id for update;
  original := current_body;
  for collection, item in
    select catalog.key, entry.value from jsonb_each(incoming) catalog
    cross join lateral jsonb_array_elements(catalog.value) entry
  loop
    select exists(select 1 from jsonb_array_elements(current_body->collection) existing where existing->>'id'=item->>'id') into matches;
    if not matches then
      current_body := jsonb_set(current_body,array[collection],(current_body->collection)||item);
    elsif collection='preparations' and item->>'id'='pqo' then
      current_body := jsonb_set(current_body,array[collection],(
        select jsonb_agg(case when existing->>'id'='pqo' and existing->>'track' is null then existing||item else existing end order by ordinal)
        from jsonb_array_elements(current_body->collection) with ordinality old(existing,ordinal)
      ));
    end if;
  end loop;
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
