import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
async function fixture(t){
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${other}');`);
  await db.exec(readFileSync(new URL('../cloud/schema.sql',import.meta.url),'utf8'));
  return db;
}
const body=id=>({profile:{id,name:'Participante',email:'synthetic@example.test'},notes:[{id:'note',userId:id,title:'Privada',body:'Conteúdo privado'}]});
async function commit(db,actor,records,catalog=null,revision=1){return db.query('select public.sp_runtime_commit($1,$2,$3::jsonb,$4::jsonb)',[actor,revision,catalog===null?null:JSON.stringify(catalog),JSON.stringify(records)]);}
test('schema privado com RLS e RPCs inacessíveis a navegador',async t=>{
  const db=await fixture(t);
  const tables=await db.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='simulou_passou_private' and relkind='r'");
  assert.equal(tables.rows.length,7);assert.ok(tables.rows.every(r=>r.relrowsecurity));
  for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    await assert.rejects(db.query('select public.sp_runtime_load($1)',[owner]),/permission denied/);
    await assert.rejects(db.query('select * from simulou_passou_private.catalog'),/permission denied/);
    await db.exec('reset role');
  }
});
test('estado por proprietário, sem alteração de catálogo ou papéis pelo aluno',async t=>{
  const db=await fixture(t);await db.exec('set role service_role');
  await commit(db,owner,[{user_id:owner,revision:0,body:body(owner)}]);
  await assert.rejects(commit(db,owner,[{user_id:other,revision:0,body:body(other)}]),/Owner mismatch/);
  await assert.rejects(commit(db,owner,[],{questions:[{correct:'A'}]}),/Administrator/);
  await assert.rejects(commit(db,owner,[{user_id:owner,revision:1,body:{...body(owner),role:'master'}}]),/Unsupported/);
  await assert.rejects(commit(db,owner,[{user_id:owner,revision:1,body:body(other)}]),/Row owner/);
  const a=(await db.query('select public.sp_runtime_load($1) as ctx',[owner])).rows[0].ctx;
  const b=(await db.query('select public.sp_runtime_load($1) as ctx',[other])).rows[0].ctx;
  assert.equal(a.admin,false);assert.equal(a.members.length,1);assert.equal(b.members.length,0);
});
test('revisões evitam perda de dados e commit é atômico',async t=>{
  const db=await fixture(t);await db.exec(`insert into simulou_passou_private.administrators(user_id) values('${owner}');set role service_role;`);
  await commit(db,owner,[{user_id:owner,revision:0,body:body(owner)}]);
  await assert.rejects(commit(db,owner,[{user_id:owner,revision:0,body:body(owner)}],{questions:['changed']}),/Concurrent/);
  const ctx=(await db.query('select public.sp_runtime_load($1) as ctx',[owner])).rows[0].ctx;
  assert.equal(ctx.catalog.revision,1);assert.deepEqual(ctx.catalog.body.questions,[]);
  await commit(db,owner,[{user_id:other,revision:0,body:body(other)}],{preparations:[],questions:[],materials:[],quizzes:[]});
  assert.equal((await db.query('select public.sp_runtime_load($1) as ctx',[owner])).rows[0].ctx.members.length,2);
});
test('acesso é do módulo e somente administração verificada o altera',async t=>{
  const db=await fixture(t);await db.exec(`insert into simulou_passou_private.administrators(user_id) values('${owner}');set role service_role;`);
  await commit(db,other,[{user_id:other,revision:0,body:body(other)}]);
  await assert.rejects(db.query('select public.sp_module_access($1,$2,true)',[other,owner]),/Administrator/);
  await db.query('select public.sp_module_access($1,$2,true)',[owner,other]);
  assert.equal((await db.query('select public.sp_runtime_load($1) as ctx',[other])).rows[0].ctx.entitled,true);
  await db.query('select public.sp_module_access($1,$2,false)',[owner,other]);
  assert.equal((await db.query('select public.sp_runtime_load($1) as ctx',[other])).rows[0].ctx.entitled,false);
});
