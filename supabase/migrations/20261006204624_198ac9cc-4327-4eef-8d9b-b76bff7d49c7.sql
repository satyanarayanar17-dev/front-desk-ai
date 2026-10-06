create schema if not exists private;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function private.is_platform_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select private.has_role(auth.uid(), 'platform_owner')
    or exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and lower(coalesce(u.email, '')) in
          ('satyanarayanareddy.tethala@gmail.com', 'satyanarayanareddy.job@gmail.com')
    );
$$;

create or replace function private.is_company_member(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = _company_id and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function private.is_company_manager(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = _company_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'manager'
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.has_role(uuid, public.app_role) to authenticated;
grant execute on function private.is_platform_owner() to authenticated;
grant execute on function private.is_company_member(uuid) to authenticated;
grant execute on function private.is_company_manager(uuid) to authenticated;

drop policy "Owner full access to companies" on public.companies;
drop policy "Members read their company" on public.companies;
drop policy "Members read their company memberships" on public.company_memberships;
drop policy "Managers and owner manage memberships" on public.company_memberships;
drop policy "Members read their company settings" on public.company_settings;
drop policy "Managers and owner update settings" on public.company_settings;
drop policy "Owner inserts settings" on public.company_settings;
drop policy "Members see their company leads" on public.frontdesk_leads;
drop policy "Members update their company leads" on public.frontdesk_leads;
drop policy "Members read their company notes" on public.enquiry_notes;
drop policy "Members add notes to their company leads" on public.enquiry_notes;
drop policy "Owner and author update notes" on public.enquiry_notes;
drop policy "Owner deletes notes" on public.enquiry_notes;
drop policy "Managers and owner read invitations" on public.company_invitations;
drop policy "Managers and owner record invitations" on public.company_invitations;
drop policy "Managers and owner update invitations" on public.company_invitations;
drop policy "Members read their company history" on public.change_history;
drop policy "Owner reads all notifications" on public.notifications;
drop policy "Users read own roles" on public.user_roles;

create policy "Owner full access to companies" on public.companies
  for all to authenticated using (private.is_platform_owner()) with check (private.is_platform_owner());
create policy "Members read their company" on public.companies
  for select to authenticated using (private.is_company_member(id));

create policy "Members read their company memberships" on public.company_memberships
  for select to authenticated
  using (user_id = auth.uid() or private.is_company_manager(company_id) or private.is_platform_owner());
create policy "Managers and owner manage memberships" on public.company_memberships
  for all to authenticated
  using (private.is_company_manager(company_id) or private.is_platform_owner())
  with check (private.is_company_manager(company_id) or private.is_platform_owner());

create policy "Members read their company settings" on public.company_settings
  for select to authenticated
  using (private.is_company_member(company_id) or private.is_platform_owner());
create policy "Managers and owner update settings" on public.company_settings
  for update to authenticated
  using (private.is_company_manager(company_id) or private.is_platform_owner())
  with check (private.is_company_manager(company_id) or private.is_platform_owner());
create policy "Owner inserts settings" on public.company_settings
  for insert to authenticated with check (private.is_platform_owner());

create policy "Members see their company leads" on public.frontdesk_leads
  for select to authenticated using (company_id is not null and private.is_company_member(company_id));
create policy "Members update their company leads" on public.frontdesk_leads
  for update to authenticated
  using (company_id is not null and private.is_company_member(company_id))
  with check (company_id is not null and private.is_company_member(company_id));

create policy "Members read their company notes" on public.enquiry_notes
  for select to authenticated
  using (private.is_company_member(company_id) or private.is_platform_owner());
create policy "Members add notes to their company leads" on public.enquiry_notes
  for insert to authenticated
  with check (author_user_id = auth.uid() and private.is_company_member(company_id));
create policy "Owner and author update notes" on public.enquiry_notes
  for update to authenticated
  using (private.is_platform_owner() or author_user_id = auth.uid())
  with check (private.is_platform_owner() or author_user_id = auth.uid());
create policy "Owner deletes notes" on public.enquiry_notes
  for delete to authenticated using (private.is_platform_owner());

create policy "Managers and owner read invitations" on public.company_invitations
  for select to authenticated
  using (private.is_company_manager(company_id) or private.is_platform_owner());
create policy "Managers and owner record invitations" on public.company_invitations
  for insert to authenticated
  with check (private.is_company_manager(company_id) or private.is_platform_owner());
create policy "Managers and owner update invitations" on public.company_invitations
  for update to authenticated
  using (private.is_company_manager(company_id) or private.is_platform_owner())
  with check (private.is_company_manager(company_id) or private.is_platform_owner());

create policy "Members read their company history" on public.change_history
  for select to authenticated
  using (private.is_platform_owner() or (company_id is not null and private.is_company_member(company_id)));

create policy "Owner reads all notifications" on public.notifications
  for select to authenticated using (private.is_platform_owner());

create policy "Users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or private.has_role(auth.uid(), 'platform_owner'));

drop function public.has_role(uuid, public.app_role);
drop function public.is_platform_owner();
drop function public.is_company_member(uuid);
drop function public.is_company_manager(uuid);

alter function public.touch_updated_at() set search_path = public;