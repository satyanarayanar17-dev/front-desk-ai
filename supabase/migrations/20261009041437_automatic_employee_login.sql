-- Total people includes managers, employees and reserved invitations.
create or replace function private.enforce_employee_allowance()
returns trigger language plpgsql security definer set search_path='' as $$
declare cid uuid; lim integer; used integer; pending integer; delta integer:=0;
begin
 cid:=new.company_id;
 perform pg_advisory_xact_lock(hashtextextended(cid::text,0));
 select seat_limit into lim from public.company_settings where company_id=cid;
 if tg_table_name='company_memberships' then
  if new.status='active' and (tg_op='INSERT' or old.status<>'active' or old.company_id<>cid) then delta:=1; end if;
 else
  if new.status='recorded' and (tg_op='INSERT' or old.status<>'recorded' or old.company_id<>cid) then delta:=1; end if;
 end if;
 if delta=0 then return new; end if;
 select count(*) into used from public.company_memberships where company_id=cid and status='active';
 select count(*) into pending from public.company_invitations where company_id=cid and status='recorded';
 if lim is null or used+pending+delta>lim then
  raise exception 'Total team limit reached; managers and employees both count' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.enforce_employee_allowance() from public,anon,authenticated;

create or replace function private.enrol_password_client(cid uuid,uid uuid,actor uuid,member_role public.app_role)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' or member_role not in ('manager','employee') or
    not (exists(select 1 from public.user_roles where user_id=actor and role='platform_owner') or
      (member_role='employee' and exists(select 1 from public.company_memberships where company_id=cid and user_id=actor and role='manager' and status='active')))
    or exists(select 1 from private.password_onboarding where user_id=actor and required) then
  raise exception 'Owner or company manager authorization required' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(cid::text,0));
 if not exists(select 1 from public.companies c join public.company_settings s on s.company_id=c.id where c.id=cid and c.status in ('active','pilot')) then
  raise exception 'Choose an active company with settings' using errcode='23514';
 end if;
 if exists(select 1 from public.user_roles where user_id=uid and role='platform_owner') or exists(select 1 from public.company_memberships where user_id=uid) then
  raise exception 'Existing accounts require separate account management' using errcode='42501';
 end if;
 insert into private.password_onboarding(user_id) values(uid);
 update public.company_invitations set status='accepted',accepted_user_id=uid,accepted_at=now()
 where company_id=cid and role=member_role and status='recorded' and lower(email)=(select lower(email) from auth.users where id=uid);
 insert into public.company_memberships(company_id,user_id,role,status) values(cid,uid,member_role,'active');
 insert into public.change_history(company_id,table_name,record_id,actor_user_id,action,changes)
 values(cid,'client_accounts',uid,actor,'created',jsonb_build_object('role',member_role,'password_change_required',true));
end;
$$;
revoke all on function private.enrol_password_client(uuid,uuid,uuid,public.app_role) from public,anon,authenticated;
grant execute on function private.enrol_password_client(uuid,uuid,uuid,public.app_role) to service_role;
-- Keep existing contracted company limits; new plans start with three people.
alter table public.company_settings alter column seat_limit set default 3;
update public.company_settings set seat_limit=3 where company_id in (select id from public.companies where slug='dk-gas-demo');
