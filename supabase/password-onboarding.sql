-- Temporary-password state is server controlled, never user metadata.
create table private.password_onboarding (
 user_id uuid primary key references auth.users(id) on delete cascade,
 required boolean not null default true,
 created_at timestamptz not null default now(),
 changed_at timestamptz
);
alter table private.password_onboarding enable row level security;
revoke all on private.password_onboarding from public,anon,authenticated;
create or replace function private.password_ready()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from private.password_onboarding p where p.user_id=auth.uid() and p.required);
$$;
revoke all on function private.password_ready() from public,anon;
grant execute on function private.password_ready() to authenticated;
create or replace function public.get_my_password_state()
returns boolean language sql stable set search_path='' as $$ select not private.password_ready(); $$;
revoke all on function public.get_my_password_state() from public,anon;
grant execute on function public.get_my_password_state() to authenticated;

-- Only an actual Auth password replacement unlocks the portal.
create or replace function private.password_replaced()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.encrypted_password is distinct from old.encrypted_password and nullif(new.encrypted_password,'') is not null then
  update private.password_onboarding set required=false,changed_at=now() where user_id=new.id and required;
 end if;
 return new;
end; $$;
revoke all on function private.password_replaced() from public,anon,authenticated;
create trigger callwoven_password_replaced after update of encrypted_password on auth.users
 for each row execute function private.password_replaced();

-- Restrictive policies combine with existing tenant/assignment rules (AND, not OR).
do $$ declare t text; begin
 foreach t in array array['companies','company_settings','company_memberships','company_invitations','frontdesk_leads','frontdesk_pilot_interests','enquiry_notes','change_history','notifications','call_analyses'] loop
  execute format('create policy "Password replacement required" on public.%I as restrictive for all to authenticated using (private.password_ready()) with check (private.password_ready())',t);
 end loop;
end $$;
create or replace function private.is_company_member(_company_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select private.password_ready() and exists(select 1 from public.company_memberships m join public.companies c on c.id=m.company_id
 where m.company_id=_company_id and m.user_id=auth.uid() and m.status='active' and c.status in ('pilot','active'));
$$;
create or replace function private.is_company_manager(_company_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select private.password_ready() and exists(select 1 from public.company_memberships m join public.companies c on c.id=m.company_id
 where m.company_id=_company_id and m.user_id=auth.uid() and m.status='active' and m.role='manager' and c.status in ('pilot','active'));
$$;

-- Called only by the owner-authorized Edge Function, using its service credential.
-- Flag + membership + invitation consumption are one transaction; seat trigger still applies.
create or replace function private.enrol_password_client(cid uuid, uid uuid, actor uuid, member_role public.app_role)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' or member_role not in ('manager','employee') or not exists
 (select 1 from public.user_roles where user_id=actor and role='platform_owner') or exists
 (select 1 from private.password_onboarding where user_id=actor and required) then
  raise exception 'Owner authorization required' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(cid::text,0));
 if not exists(select 1 from public.companies c join public.company_settings s on s.company_id=c.id where c.id=cid and c.status in ('active','pilot')) then
  raise exception 'Choose an active company with settings' using errcode='23514';
 end if;
 insert into private.password_onboarding(user_id) values(uid);
 update public.company_invitations set status='accepted',accepted_user_id=uid,accepted_at=now()
 where company_id=cid and role=member_role and status='recorded' and lower(email)=(select lower(email) from auth.users where id=uid);
 insert into public.company_memberships(company_id,user_id,role,status) values(cid,uid,member_role,'active');
 insert into public.change_history(company_id,table_name,record_id,actor_user_id,action,changes)
 values(cid,'client_accounts',uid,actor,'created',jsonb_build_object('role',member_role,'password_change_required',true));
end; $$;
revoke all on function private.enrol_password_client(uuid,uuid,uuid,public.app_role) from public,anon,authenticated;
grant execute on function private.enrol_password_client(uuid,uuid,uuid,public.app_role) to service_role;
create or replace function public.enrol_password_client(cid uuid, uid uuid, actor uuid, member_role public.app_role)
returns void language sql security invoker set search_path='' as $$ select private.enrol_password_client(cid,uid,actor,member_role); $$;
revoke all on function public.enrol_password_client(uuid,uuid,uuid,public.app_role) from public,anon,authenticated;
grant execute on function public.enrol_password_client(uuid,uuid,uuid,public.app_role) to service_role;
grant usage on schema private to service_role;
