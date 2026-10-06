create table public.call_analyses (
 lead_id uuid primary key references public.frontdesk_leads(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 transcript text not null check(length(transcript) between 20 and 16000),
 analysis jsonb not null check(jsonb_typeof(analysis)='object'),
 model text not null,
 updated_at timestamptz not null default now()
);
alter table public.call_analyses enable row level security;
grant select,insert,update on public.call_analyses to authenticated;
grant all on public.call_analyses to service_role;
create policy "Read analysis for accessible assigned call" on public.call_analyses for select to authenticated using (
 private.is_platform_owner() or exists(select 1 from public.frontdesk_leads l where l.id=lead_id and l.company_id=call_analyses.company_id));
create policy "Managers save reviewed analysis" on public.call_analyses for insert to authenticated with check (
 created_by=auth.uid() and private.is_company_manager(company_id) and private.company_feature(company_id,'leads')
 and exists(select 1 from public.company_settings s where s.company_id=call_analyses.company_id and s.features->>'ai_analysis' is distinct from 'false')
 and exists(select 1 from public.frontdesk_leads l where l.id=lead_id and l.company_id=call_analyses.company_id));
create policy "Managers update reviewed analysis" on public.call_analyses for update to authenticated using (
 private.is_company_manager(company_id) and private.company_feature(company_id,'leads')
 and exists(select 1 from public.company_settings s where s.company_id=call_analyses.company_id and s.features->>'ai_analysis' is distinct from 'false')
 and exists(select 1 from public.frontdesk_leads l where l.id=lead_id and l.company_id=call_analyses.company_id)) with check (
 created_by=auth.uid() and private.is_company_manager(company_id) and private.company_feature(company_id,'leads')
 and exists(select 1 from public.company_settings s where s.company_id=call_analyses.company_id and s.features->>'ai_analysis' is distinct from 'false')
 and exists(select 1 from public.frontdesk_leads l where l.id=lead_id and l.company_id=call_analyses.company_id));

create table private.transcript_analysis_usage (
 company_id uuid not null references public.companies(id) on delete cascade,
 period timestamptz not null, requests integer not null default 0,
 primary key(company_id,period)
);
alter table private.transcript_analysis_usage enable row level security;
revoke all on private.transcript_analysis_usage from public,anon,authenticated;
create or replace function private.reserve_transcript_analysis(cid uuid)
returns void language plpgsql security definer set search_path='' as $$
declare p timestamptz:=date_trunc('hour',now()); used integer;
begin
 if auth.uid() is null or not private.is_company_manager(cid) or not private.company_feature(cid,'leads') or not exists (
 select 1 from public.company_settings s where s.company_id=cid and s.features->>'ai_analysis' is distinct from 'false') then
 raise exception 'Manager access required' using errcode='42501'; end if;
 insert into private.transcript_analysis_usage(company_id,period,requests) values(cid,p,1)
 on conflict(company_id,period) do update set requests=transcript_analysis_usage.requests+1
 where transcript_analysis_usage.requests<30 returning requests into used;
 if used is null then raise exception 'Analysis allowance reached' using errcode='P0001'; end if;
end;
$$;
revoke all on function private.reserve_transcript_analysis(uuid) from public,anon;
grant execute on function private.reserve_transcript_analysis(uuid) to authenticated;
create or replace function public.reserve_transcript_analysis(cid uuid)
returns void language sql security invoker set search_path='' as $$ select private.reserve_transcript_analysis(cid); $$;
revoke all on function public.reserve_transcript_analysis(uuid) from public,anon;
grant execute on function public.reserve_transcript_analysis(uuid) to authenticated;
create or replace function private.record_analysis_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.change_history(company_id,table_name,record_id,actor_user_id,action,changes)
 values(new.company_id,'call_analyses',new.lead_id,auth.uid(),lower(tg_op),jsonb_build_object('model',new.model,'reviewed',true));
 return null;
end;
$$;
revoke all on function private.record_analysis_change() from public,anon,authenticated;
create trigger analysis_portal_history after insert or update on public.call_analyses for each row execute function private.record_analysis_change();
