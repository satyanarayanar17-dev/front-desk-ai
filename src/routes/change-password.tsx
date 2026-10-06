import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { getPortalAccess, portalDestination } from "@/lib/portal-access";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/Marketing";
export const Route = createFileRoute("/change-password")({
 ssr: false, staticData: { sitemap: false },
 head: () => ({ meta: [{ title: "Set your password — Callwoven" }, { name: "robots", content: "noindex" }] }),
 beforeLoad: async () => { const access=await getPortalAccess(); if (!access) throw redirect({to:"/login"}); return {access}; },
 component: ChangePassword,
});
function ChangePassword() {
 const {access}=Route.useRouteContext(); const navigate=useNavigate();
 const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 const submit=async(e:FormEvent)=>{
  e.preventDefault(); if(busy)return;
  if(password.length<12){setError("Use at least 12 characters.");return;}
  if(password!==confirm){setError("The passwords do not match.");return;}
  setBusy(true);setError("");
  try {
   const {error}=await getSupabase().auth.updateUser({password});
   if(error) throw error;
   const {data:required,error:checkError}=await getSupabase().rpc("get_my_password_state");
   if(checkError||required)throw new Error("verification");
   sessionStorage.removeItem("callwoven-password-recovery");
   setPassword("");setConfirm("");
   const current=await getPortalAccess();
   await navigate({to:current&&portalDestination(current)||"/login",replace:true});
  } catch(err){
   const code=(err as {code?:string}).code;
   setError(code==="same_password" ? "Choose a different password from your current or temporary password." : code==="weak_password" ? "Choose a stronger password with letters, numbers and symbols." : "Couldn’t change your password. Try again, or request a fresh reset link.");
  } finally {setBusy(false);}
 };
 const input="w-full rounded-lg border border-input bg-background px-3 py-2.5";
 return <div className="callwoven-hero flex min-h-screen items-center justify-center p-4"><div className="w-full max-w-sm rounded-2xl bg-card/95 p-8 shadow-xl"><Mark descriptor="ACCOUNT"/><h1 className="mt-6 text-xl font-semibold">Set your new password</h1><p className="mt-2 text-sm text-muted-foreground">{access.passwordChangeRequired ? "Replace your temporary password before entering your portal." : "Choose a new password for your account."}</p><p className="mt-2 break-all text-xs text-muted-foreground">{access.email}</p><form className="mt-5 space-y-3" onSubmit={submit}><label className="block text-sm">New password<input className={input} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="block text-sm">Confirm password<input className={input} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><p className="text-xs text-muted-foreground">Use at least 12 characters, including letters, numbers and symbols.</p>{error&&<p className="text-sm text-destructive" role="alert">{error}</p>}<Button className="w-full rounded-full" disabled={busy}>{busy?"Saving…":"Save password and continue"}</Button></form><button className="mt-4 text-sm underline" disabled={busy} onClick={async()=>{await getSupabase().auth.signOut();sessionStorage.removeItem("callwoven-password-recovery");await navigate({to:"/login",replace:true});}}>Sign out</button></div></div>;
}
