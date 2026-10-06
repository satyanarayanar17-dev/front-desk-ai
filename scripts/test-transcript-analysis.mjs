import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
const dir = new URL('../.sites-runtime/analysis-tests/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const name of ['transcript-analysis','supabase','call-analysis.server']) {
 const code = readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8');
 const compiled = ts.transpileModule(code, { compilerOptions: { target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext } }).outputText.replace(/from "\.\/(transcript-analysis|supabase)"/g,'from "./$1.mjs"');
 writeFileSync(new URL(`${name}.mjs`,dir),compiled);
}
const {handleCallAnalysis} = await import(new URL('call-analysis.server.mjs',dir));
const {validateAnalysis} = await import(new URL('transcript-analysis.mjs',dir));
const transcript='Caller: I need a cleaning appointment next week. My budget is £120. Please call me back.';
const draft={summary:'Caller requests a cleaning appointment.',followUpActions:['Ask the practice team to confirm availability.'],needs:[{need:'Cleaning appointment',evidence:'I need a cleaning appointment'}],urgency:{level:'routine',reason:'No urgency stated.',evidence:'next week'},budget:{value:'£120',evidence:'My budget is £120'},timeline:{value:'Next week',evidence:'next week'}};
let paid=0, quota=0;
const mock=(opts={})=>async (input,init)=>{
 const url=String(input);
 if(url.includes('api.openai.com')) {paid++; const body=JSON.parse(init.body);assert.equal(body.model,'gpt-4.1-mini-2025-04-14');assert.equal(body.store,false);assert.equal(body.response_format.json_schema.strict,true);assert.equal(init.headers['Lovable-API-Key'],undefined); if(opts.noCredit) return Response.json({error:{code:'insufficient_quota'}},{status:429}); if(opts.refusal) return Response.json({choices:[{message:{refusal:'Unable to comply'}}]}); if(opts.truncated) return Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]}); if(opts.gatewayStatus) return new Response('{}',{status:opts.gatewayStatus}); return Response.json({choices:[{message:{content:opts.badOutput?'{}':JSON.stringify(draft)}}]});}
 if(url.includes('/auth/v1/user')) return opts.badAuth?Response.json({msg:'invalid token'},{status:401}):Response.json({id:'u1',email:'test@example.invalid'});
 if(url.includes('/frontdesk_leads')) return Response.json(opts.otherCompany?null:{id:'11111111-1111-1111-1111-111111111111',company_id:'c1'});
 if(url.includes('/company_memberships')) return Response.json(opts.employee?null:{id:'m1'});
 if(url.includes('/company_settings')) return Response.json({features:{ai_analysis:!opts.disabled}});
 if(url.includes('/rpc/reserve_transcript_analysis')) {quota++;return opts.rateLimit?Response.json({code:'P0001',message:'limit'},{status:400}):Response.json(null);}
 throw new Error('Unexpected test request: '+url);
};
const request=(body={leadId:'11111111-1111-1111-1111-111111111111',transcript},token=true)=>new Request('https://callwoven.com/api/call-analysis',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer synthetic-test-token'}:{})},body:JSON.stringify(body)});
assert.equal((await handleCallAnalysis(request({},false),{},mock())).status,401);
for(const options of [{badAuth:true},{employee:true},{otherCompany:true},{disabled:true}]) {
 const before=paid;assert.ok([401,403].includes((await handleCallAnalysis(request(),{OPENAI_API_KEY:'test'},mock(options))).status));assert.equal(paid,before);
}
assert.equal((await handleCallAnalysis(request(),{},mock())).status,503);
assert.equal(paid,0);assert.equal(quota,0);
assert.equal((await handleCallAnalysis(request({leadId:'bad',transcript}),{OPENAI_API_KEY:'test'},mock())).status,400);
assert.equal((await handleCallAnalysis(request(),{OPENAI_API_KEY:'test'},mock({rateLimit:true}))).status,429);assert.equal(paid,0);
for(const [status,expected] of [[401,503],[403,503],[429,429],[500,502]]) assert.equal((await handleCallAnalysis(request(),{OPENAI_API_KEY:'test'},mock({gatewayStatus:status}))).status,expected);
assert.equal((await handleCallAnalysis(request(),{OPENAI_API_KEY:'test'},mock({badOutput:true}))).status,502);
assert.equal((await handleCallAnalysis(request(),{OPENAI_API_KEY:'test'},mock({noCredit:true}))).status,503);
assert.equal((await handleCallAnalysis(request(),{OPENAI_API_KEY:'test'},mock({refusal:true}))).status,422);
assert.equal((await handleCallAnalysis(request(),{OPENAI_API_KEY:'test'},mock({truncated:true}))).status,502);
const response=await handleCallAnalysis(request(),{OPENAI_API_KEY:'test'},mock());assert.equal(response.status,200);assert.equal((await response.json()).analysis.budget.value,'£120');
const invented=validateAnalysis({...draft,budget:{value:'£500',evidence:'I can spend £500'},timeline:{value:'Tomorrow',evidence:null},urgency:{level:'emergency',reason:'Invented',evidence:'Emergency!'}},transcript);
assert.equal(invented.budget.value,null);assert.equal(invented.timeline.value,null);assert.equal(invented.urgency.level,'unknown');
const hostile=request(); hostile.headers.set('origin','https://example.invalid');assert.equal((await handleCallAnalysis(hostile,{OPENAI_API_KEY:'test'},mock())).status,403);
console.log('Transcript endpoint checks passed: authentication, manager access, tenant access, feature restrictions, input bounds, quota, missing key, OpenAI errors, invalid output and unsupported facts. No real model calls.');
