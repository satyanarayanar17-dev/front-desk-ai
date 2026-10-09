// Dependency injection keeps authorization and compensation testable without creating real users.
export function createClientLoginHandler(createClient: any, env: (key: string) => string | undefined) {
 const origins=new Set(['https://callwoven.com','https://www.callwoven.com']);
 return async (req: Request) => {
  const origin=req.headers.get('origin');
  const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&origins.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'});
  const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.has(origin))return reply(403,{error:'Origin not allowed.'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'Use POST.'});
  const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return reply(401,{error:'Sign in to your account.'});
  try {
   const url=env('SUPABASE_URL'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
   if(!url||!secret)return reply(503,{error:'Account setup is unavailable.'});
   const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:identity,error:authError}=await admin.auth.getUser(token);
   if(authError||!identity.user)return reply(401,{error:'Your session expired. Sign in again.'});
   const caller=createClient(url,env('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
   const {data:access,error:accessError}=await caller.rpc('get_my_portal_access');
   const {data:required,error:stateError}=await caller.rpc('get_my_password_state');
   if(accessError||stateError||required!==false)return reply(403,{error:'Finish signing in before creating logins.'});
   if(Number(req.headers.get('content-length')||0)>2048)return reply(413,{error:'Request too large.'});
   const text=await req.text(); if(text.length>2048)return reply(413,{error:'Request too large.'});
   let body;try{body=JSON.parse(text);}catch{return reply(400,{error:'Invalid request.'});}
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   const cid=body.companyId,role=body.role;
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof cid!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cid)||!['manager','employee'].includes(role))return reply(400,{error:'Enter a valid email, company and role.'});
   const manager=access?.memberships?.some((m:any)=>m.company_id===cid&&m.role==='manager'&&m.status==='active');
   if(!access?.is_owner&&(!manager||role!=='employee'))return reply(403,{error:'Managers can only create employee logins for their own company.'});
   const {data:company,error:companyError}=await caller.from('companies').select('id,status').eq('id',cid).single();
   if(companyError||!company||!['pilot','active'].includes(company.status))return reply(400,{error:'Choose an active company.'});
   const bytes=crypto.getRandomValues(new Uint8Array(24));
   const temporaryPassword=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')+'Aa1!';
   // This creates an account only. No invitation or other email is sent.
   const {data:created,error:createError}=await admin.auth.admin.createUser({email,password:temporaryPassword,email_confirm:true});
   if(createError||!created.user)return reply(409,{error:'Could not create this login. This email may already have an account. Use a different employee email or contact Callwoven; existing accounts are not overwritten.'});
   const {error:enrolError}=await admin.rpc('enrol_password_client',{cid,uid:created.user.id,actor:identity.user.id,member_role:role});
   if(enrolError){
    const {error:cleanupError}=await admin.auth.admin.deleteUser(created.user.id);
    if(cleanupError)return reply(500,{error:'Account setup was incomplete. Contact support before retrying.'});
    return reply(400,{error:enrolError.code==='23514'?'The team limit has been reached or company setup prevents this login. Managers and employees both count toward the limit.':'Account setup failed. No login was retained.'});
   }
   return reply(201,{email,temporaryPassword,role});
  }catch{return reply(500,{error:'Account setup was interrupted. Check whether the login exists before retrying.'});}
 };
}
