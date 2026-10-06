-- Additive integration fixes; historical calls remain unassigned.
alter table public.frontdesk_leads add column if not exists assigned_employee_id uuid references auth.users(id) on delete set null;
create index if not exists frontdesk_leads_employee_idx on public.frontdesk_leads(company_id, assigned_employee_id);

create or replace function private.is_company_member(_company_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.company_memberships m join public.companies c on c.id=m.company_id
 where m.company_id=_company_id and m.user_id=auth.uid() and m.status='active' and c.status in ('pilot','active'));
$$;
create or replace function private.is_company_manager(_company_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.company_memberships m join public.companies c on c.id=m.company_id
 where m.company_id=_company_id and m.user_id=auth.uid() and m.status='active' and m.role='manager' and c.status in ('pilot','active'));
$$;
revoke all on function private.is_company_member(uuid),private.is_company_manager(uuid) from public,anon;
grant execute on function private.is_company_member(uuid),private.is_company_manager(uuid) to authenticated;

create or replace function private.company_feature(cid uuid, feature text)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.companies c join public.company_settings s on s.company_id=c.id
  where c.id=cid and c.status in ('pilot','active') and coalesce((s.features->>feature)::boolean,false)
 );
$$;
create or replace function private.can_access_lead(cid uuid, employee uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and (private.is_platform_owner() or
  (private.company_feature(cid,'leads') and private.is_company_member(cid)
   and (private.is_company_manager(cid) or employee=auth.uid())));
$$;
revoke all on function private.company_feature(uuid,text), private.can_access_lead(uuid,uuid) from public, anon;
grant execute on function private.company_feature(uuid,text), private.can_access_lead(uuid,uuid) to authenticated;

drop policy if exists "Managers and owner update settings" on public.company_settings;
create policy "Owner updates settings" on public.company_settings for update to authenticated
 using (private.is_platform_owner()) with check (private.is_platform_owner());
drop policy if exists "Members see their company leads" on public.frontdesk_leads;
drop policy if exists "Members update their company leads" on public.frontdesk_leads;
create policy "Assigned enquiry access" on public.frontdesk_leads for select to authenticated
 using (private.can_access_lead(company_id,assigned_employee_id));
create policy "Assigned enquiry updates" on public.frontdesk_leads for update to authenticated
 using (private.can_access_lead(company_id,assigned_employee_id))
 with check (private.can_access_lead(company_id,assigned_employee_id));

-- Members cannot edit caller records, move enquiries or grant themselves work.
create or replace function private.guard_lead_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.role()='authenticated' and not private.is_platform_owner() then
  if (to_jsonb(new)-array['status','updated_at','assigned_employee_id']) is distinct from
     (to_jsonb(old)-array['status','updated_at','assigned_employee_id']) then
   raise exception 'Only enquiry status and employee assignment may be changed' using errcode='42501';
  end if;
  if new.assigned_employee_id is distinct from old.assigned_employee_id and not private.is_company_manager(old.company_id) then
   raise exception 'Only managers assign enquiries' using errcode='42501';
  end if;
 end if;
 if new.assigned_employee_id is not null and
    (tg_op='INSERT' or new.assigned_employee_id is distinct from old.assigned_employee_id or new.company_id is distinct from old.company_id) and not exists (
  select 1 from public.company_memberships m where m.company_id=new.company_id
   and m.user_id=new.assigned_employee_id and m.role='employee' and m.status='active'
 ) then raise exception 'Choose an active employee of this company' using errcode='23514'; end if;
 return new;
end;
$$;
create trigger guard_portal_lead before insert or update on public.frontdesk_leads for each row execute function private.guard_lead_update();

drop policy if exists "Members read their company notes" on public.enquiry_notes;
drop policy if exists "Members add notes to their company leads" on public.enquiry_notes;
drop policy if exists "Owner and author update notes" on public.enquiry_notes;
create policy "Notes on accessible enquiries" on public.enquiry_notes for select to authenticated using (
 private.is_platform_owner() or (private.company_feature(company_id,'notes') and exists
  (select 1 from public.frontdesk_leads l where l.id=lead_id and l.company_id=enquiry_notes.company_id)));
create policy "Add notes on accessible enquiries" on public.enquiry_notes for insert to authenticated with check (
 author_user_id=auth.uid() and (private.is_platform_owner() or private.company_feature(company_id,'notes')) and exists
  (select 1 from public.frontdesk_leads l where l.id=lead_id and l.company_id=enquiry_notes.company_id));
create policy "Update accessible own notes" on public.enquiry_notes for update to authenticated using (
 private.is_platform_owner() or (author_user_id=auth.uid() and private.company_feature(company_id,'notes') and exists
  (select 1 from public.frontdesk_leads l where l.id=lead_id and l.company_id=enquiry_notes.company_id))) with check (
 private.is_platform_owner() or (author_user_id=auth.uid() and private.company_feature(company_id,'notes') and exists
  (select 1 from public.frontdesk_leads l where l.id=lead_id and l.company_id=enquiry_notes.company_id)));
drop policy if exists "Members read their company history" on public.change_history;
create policy "Owner and managers read history" on public.change_history for select to authenticated
 using (private.is_platform_owner() or private.is_company_manager(company_id));

-- Managers can administer employees only, never create or modify managers.
drop policy if exists "Managers and owner manage memberships" on public.company_memberships;
create policy "Manage employees within company" on public.company_memberships for all to authenticated
 using (private.is_platform_owner() or (role='employee' and private.is_company_manager(company_id)))
 with check (private.is_platform_owner() or (role='employee' and private.is_company_manager(company_id)));
create or replace function private.guard_member_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.role()='authenticated' and not private.is_platform_owner() and
    (new.company_id is distinct from old.company_id or new.user_id is distinct from old.user_id or new.role is distinct from old.role) then
  raise exception 'Membership identity and role are owner controlled' using errcode='42501';
 end if;
 return new;
end;
$$;
create trigger guard_member_identity before update on public.company_memberships for each row execute function private.guard_member_identity();
drop policy if exists "Managers and owner record invitations" on public.company_invitations;
drop policy if exists "Managers and owner update invitations" on public.company_invitations;
create policy "Reserve employee invitations" on public.company_invitations for insert to authenticated with check (
 status='recorded' and accepted_user_id is null and accepted_at is null and
 (private.is_platform_owner() or (role='employee' and private.is_company_manager(company_id))));
create policy "Owner updates invitations" on public.company_invitations for update to authenticated
 using (private.is_platform_owner()) with check (private.is_platform_owner());

-- The same transaction lock serializes reservations and activations per company.
create or replace function private.enforce_employee_allowance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cid uuid; lim integer; used integer; pending integer; delta integer:=0;
begin
 cid:=new.company_id;
 perform pg_advisory_xact_lock(hashtextextended(cid::text,0));
 select seat_limit into lim from public.company_settings where company_id=cid;
 if tg_table_name='company_memberships' then
  if new.role='employee' and new.status='active' and (tg_op='INSERT' or old.status<>'active' or old.role<>'employee' or old.company_id<>cid) then delta:=1; end if;
 else
  if new.role='employee' and new.status='recorded' and (tg_op='INSERT' or old.status<>'recorded' or old.role<>'employee' or old.company_id<>cid) then delta:=1; end if;
 end if;
 if delta=0 then return new; end if;
 select count(*) into used from public.company_memberships where company_id=cid and role='employee' and status='active';
 select count(*) into pending from public.company_invitations where company_id=cid and role='employee' and status='recorded';
 if lim is null or used+pending+delta>lim then raise exception 'Employee allowance reached; contact Callwoven' using errcode='23514'; end if;
 return new;
end;
$$;
create trigger enforce_membership_allowance before insert or update on public.company_memberships for each row execute function private.enforce_employee_allowance();
create trigger enforce_invitation_allowance before insert or update on public.company_invitations for each row execute function private.enforce_employee_allowance();
create or replace function private.guard_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.company_id::text,0));
 if new.seat_limit<0 or new.included_minutes<0 then raise exception 'Allowances cannot be negative' using errcode='23514'; end if;
 return new;
end;
$$;
create trigger guard_company_allowances before insert or update on public.company_settings for each row execute function private.guard_settings();
create unique index if not exists company_unique_phone on public.company_settings(regexp_replace(inbound_phone_number,'[^0-9]','','g')) where nullif(inbound_phone_number,'') is not null;
create unique index if not exists company_unique_assistant on public.company_settings(assistant_id) where nullif(assistant_id,'') is not null;
create unique index if not exists company_pending_invitation on public.company_invitations(company_id,lower(email)) where status='recorded';

create or replace function private.record_portal_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare j jsonb; cid uuid; rid uuid;
begin
 j:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 cid:=case when tg_table_name='companies' then (j->>'id')::uuid else (j->>'company_id')::uuid end;
 rid:=coalesce((j->>'id')::uuid,cid);
 insert into public.change_history(company_id,table_name,record_id,actor_user_id,action,changes)
 values(cid,tg_table_name,rid,auth.uid(),lower(tg_op),j-array['raw_payload']);
 return null;
end;
$$;
create trigger companies_portal_history after insert or update or delete on public.companies for each row execute function private.record_portal_change();
create trigger settings_portal_history after insert or update on public.company_settings for each row execute function private.record_portal_change();
create trigger memberships_portal_history after insert or update or delete on public.company_memberships for each row execute function private.record_portal_change();
create trigger invitations_portal_history after insert or update on public.company_invitations for each row execute function private.record_portal_change();
revoke all on function private.record_portal_change() from public,anon,authenticated;

-- Trigger functions are internal, never callable through the Data API.
revoke all on function private.guard_lead_update(),private.guard_member_identity(),private.enforce_employee_allowance(),private.guard_settings() from public,anon,authenticated;
create or replace function public.get_my_portal_access()
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('is_owner',exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role='platform_owner'),
 'memberships',coalesce((select jsonb_agg(jsonb_build_object('company_id',m.company_id,'role',m.role,'status',case when c.status in ('pilot','active') then m.status else 'deactivated' end))
 from public.company_memberships m join public.companies c on c.id=m.company_id where m.user_id=auth.uid()),'[]'::jsonb));
$$;
revoke all on function public.get_my_portal_access() from public,anon;
grant execute on function public.get_my_portal_access() to authenticated;
