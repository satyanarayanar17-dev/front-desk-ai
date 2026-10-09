import { useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
export function CreateClientLogin({companyId,active,employeeOnly=false,onCreated}:{companyId:string;active:boolean;employeeOnly?:boolean;onCreated?:()=>void}) {
 const [email,setEmail]=useState('');const [role,setRole]=useState(employeeOnly?'employee':'manager');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [created,setCreated]=useState<{email:string;temporaryPassword:string;role:string}|null>(null);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(busy||!active)return;setBusy(true);setError('');
  try {
   const {data,error}=await getSupabase().functions.invoke('create-client-login',{body:{email,companyId,role:employeeOnly?'employee':role}});
   if(error){
    const response=(error as {context?:Response}).context;
    const body=response&&typeof response.json==='function'?await response.json().catch(()=>null):null;
    throw new Error(body?.error||'Could not create login. Check your session and company settings.');
   }
   if(!data?.temporaryPassword)throw new Error('Account setup returned no credentials. Check before retrying.');
   setCreated(data);setEmail('');onCreated?.();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 const field='mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
 return <section className="mt-6 border-t border-border pt-5"><h3 className="font-semibold">{employeeOnly?'Add employee':'Create client login'}</h3><p className="mt-1 text-xs text-muted-foreground">{employeeOnly?'Create an employee login immediately within your team limit. Employees only see calls assigned to them.':'Create manager or employee logins within the company’s total team limit.'}</p>{created?<div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/40 p-4"><p className="text-sm font-medium">Login created · {created.role}</p><p className="break-all text-sm">Email: {created.email}</p><label className="block text-xs font-medium">Temporary password<input className={field} readOnly autoComplete="off" value={created.temporaryPassword} onFocus={e=>e.target.select()}/></label><p className="text-xs text-muted-foreground">Shown only here. Share securely with the account holder. They must set a different password before entering their portal. No email has been sent.</p><Button variant="outline" onClick={()=>setCreated(null)}>Done — clear password</Button></div>:<form className="mt-3 space-y-3" onSubmit={submit}><label className="block text-sm">Login email<input className={field} type="email" autoComplete="off" required value={email} onChange={e=>setEmail(e.target.value)}/></label>{!employeeOnly&&<label className="block text-sm">Role<select className={field} value={role} onChange={e=>setRole(e.target.value)}><option value="manager">Company manager</option><option value="employee">Employee</option></select></label>}{!active&&<p className="text-xs text-muted-foreground">The company must be active and have a plan before creating a login.</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy||!active}>{busy?'Creating…':'Create login and temporary password'}</Button></form>}</section>;
}
