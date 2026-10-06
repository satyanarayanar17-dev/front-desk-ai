import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import ts from 'typescript';
await mkdir('.sites-runtime/password-tests',{recursive:true});
const source=await readFile('supabase/functions/create-client-login/handler.ts','utf8');
await writeFile('.sites-runtime/password-tests/handler.mjs',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
const {createClientLoginHandler}=await import('../.sites-runtime/password-tests/handler.mjs');
const cid='22222222-0000-0000-0000-000000000001';
function setup(config={}) {
 const calls=[];
 const admin={auth:{getUser:async()=>({data:{user:config.invalid?null:{id:'owner'}},error:null}),admin:{
 createUser:async b=>{calls.push(['create',b]);return {data:{user:config.duplicate?null:{id:'new-client'}},error:config.duplicate?{}:null};},
 deleteUser:async id=>{calls.push(['delete',id]);return {error:config.cleanupFailure?{}:null};}
 }},rpc:async(name,args)=>{calls.push([name,args]);return {error:config.enrolFailure?{code:'23514'}:null};}};
 const caller={rpc:async name=>name==='get_my_password_state'?{data:!!config.pending,error:null}:{data:{is_owner:config.isOwner!==false},error:config.accessError?{}:null},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:cid,status:config.paused?'paused':'active'},error:null})})})})};
 const handler=createClientLoginHandler((url,key)=>key==='server-secret'?admin:caller,key=>({SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-secret',SUPABASE_ANON_KEY:'public-key'})[key]);
 return {calls,handler};
}
async function run(config={},body={email:'CLIENT@example.invalid',companyId:cid,role:'manager'},headers={Authorization:'Bearer test',Origin:'https://callwoven.com'}){
 const {handler,calls}=setup(config); const response=await handler(new Request('https://example.invalid',{method:'POST',headers,body:JSON.stringify(body)}));return {response,calls,body:await response.json()};
}
for(const cfg of [{isOwner:false},{pending:true},{accessError:true}]){const r=await run(cfg);assert.equal(r.response.status,403);assert.equal(r.calls.length,0);}
assert.equal((await run({invalid:true})).response.status,401);
assert.equal((await run({},undefined,{})).response.status,401);
assert.equal((await run({},undefined,{Origin:'https://foreign.invalid',Authorization:'Bearer test'})).response.status,403);
for(const body of [{email:'bad',companyId:cid,role:'manager'},{email:'a@b.invalid',companyId:cid,role:'platform_owner'},{email:'a@b.invalid',companyId:'invalid',role:'employee'}]){const r=await run({},body);assert.equal(r.response.status,400);assert.equal(r.calls.length,0);}
const paused=await run({paused:true});assert.equal(paused.response.status,400);assert.equal(paused.calls.length,0);
const duplicate=await run({duplicate:true});assert.equal(duplicate.response.status,409);assert.equal(duplicate.calls.length,1);
const failed=await run({enrolFailure:true});assert.equal(failed.response.status,400);assert.deepEqual(failed.calls.map(c=>c[0]),['create','enrol_password_client','delete']);assert.ok(!failed.body.temporaryPassword);
const cleanup=await run({enrolFailure:true,cleanupFailure:true});assert.equal(cleanup.response.status,500);assert.ok(!cleanup.body.temporaryPassword);
const good=await run();assert.equal(good.response.status,201);assert.equal(good.body.email,'client@example.invalid');assert.match(good.body.temporaryPassword,/^[a-f0-9]{48}Aa1!$/);assert.equal(good.response.headers.get('cache-control'),'no-store');
assert.deepEqual(good.calls[1][1],{cid,uid:'new-client',actor:'owner',member_role:'manager'});assert.equal(good.calls[0][1].email_confirm,true);assert.ok(!good.calls[0][1].user_metadata);
const other=await run();assert.notEqual(good.body.temporaryPassword,other.body.temporaryPassword);
// Credentials never printed by these tests.
console.log('Password onboarding authorization, input validation, secure credentials and compensation tests passed.');
