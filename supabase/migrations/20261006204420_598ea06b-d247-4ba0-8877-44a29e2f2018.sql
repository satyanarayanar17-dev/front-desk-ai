create type public.app_role as enum ('platform_owner', 'manager', 'employee');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_email text,
  contact_phone text,
  status text not null default 'pilot' check (status in ('pilot','active','paused','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'employee' check (role in ('manager','employee')),
  status text not null default 'active' check (status in ('active','deactivated')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  seat_limit int not null default 5,
  included_minutes int not null default 500,
  features jsonb not null default '{"leads":true,"notes":false,"sms":false,"reports":false}'::jsonb,
  assistant_id text,
  inbound_phone_number text,
  call_routing_status text not null default 'unmapped' check (call_routing_status in ('unmapped','mapped')),
  updated_at timestamptz not null default now()
);

alter table public.frontdesk_leads
  add column company_id uuid references public.companies(id) on delete set null,
  add column assignment_status text not null default 'unmatched' check (assignment_status in ('unmatched','assigned','quarantined')),
  add column assigned_by uuid references auth.users(id) on delete set null,
  add column assigned_at timestamptz,
  add column match_reason text;

create table public.enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.frontdesk_leads(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'employee' check (role in ('manager','employee')),
  status text not null default 'recorded' check (status in ('recorded','accepted')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz
);

create table public.change_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  table_name text not null,
  record_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null default 'platform_owner',
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_platform_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'platform_owner')
    or exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and lower(coalesce(u.email, '')) in
          ('satyanarayanareddy.tethala@gmail.com', 'satyanarayanareddy.job@gmail.com')
    );
$$;

create or replace function public.is_company_member(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = _company_id and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.is_company_manager(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = _company_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'manager'
  );
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.company_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiry_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.company_invitations TO authenticated;
GRANT SELECT, INSERT ON public.change_history TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.company_memberships TO service_role;
GRANT ALL ON public.company_settings TO service_role;
GRANT ALL ON public.enquiry_notes TO service_role;
GRANT ALL ON public.company_invitations TO service_role;
GRANT ALL ON public.change_history TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

create policy "Owner full access to companies" on public.companies
  for all to authenticated using (public.is_platform_owner()) with check (public.is_platform_owner());
create policy "Members read their company" on public.companies
  for select to authenticated using (public.is_company_member(id));

create policy "Members read their company memberships" on public.company_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_company_manager(company_id) or public.is_platform_owner());
create policy "Managers and owner manage memberships" on public.company_memberships
  for all to authenticated
  using (public.is_company_manager(company_id) or public.is_platform_owner())
  with check (public.is_company_manager(company_id) or public.is_platform_owner());

create policy "Members read their company settings" on public.company_settings
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_owner());
create policy "Managers and owner update settings" on public.company_settings
  for update to authenticated
  using (public.is_company_manager(company_id) or public.is_platform_owner())
  with check (public.is_company_manager(company_id) or public.is_platform_owner());
create policy "Owner inserts settings" on public.company_settings
  for insert to authenticated with check (public.is_platform_owner());

create policy "Members see their company leads" on public.frontdesk_leads
  for select to authenticated using (company_id is not null and public.is_company_member(company_id));
create policy "Members update their company leads" on public.frontdesk_leads
  for update to authenticated
  using (company_id is not null and public.is_company_member(company_id))
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Members read their company notes" on public.enquiry_notes
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_owner());
create policy "Members add notes to their company leads" on public.enquiry_notes
  for insert to authenticated
  with check (author_user_id = auth.uid() and public.is_company_member(company_id));
create policy "Owner and author update notes" on public.enquiry_notes
  for update to authenticated
  using (public.is_platform_owner() or author_user_id = auth.uid())
  with check (public.is_platform_owner() or author_user_id = auth.uid());
create policy "Owner deletes notes" on public.enquiry_notes
  for delete to authenticated using (public.is_platform_owner());

create policy "Managers and owner read invitations" on public.company_invitations
  for select to authenticated
  using (public.is_company_manager(company_id) or public.is_platform_owner());
create policy "Managers and owner record invitations" on public.company_invitations
  for insert to authenticated
  with check (public.is_company_manager(company_id) or public.is_platform_owner());
create policy "Managers and owner update invitations" on public.company_invitations
  for update to authenticated
  using (public.is_company_manager(company_id) or public.is_platform_owner())
  with check (public.is_company_manager(company_id) or public.is_platform_owner());

create policy "Members read their company history" on public.change_history
  for select to authenticated
  using (public.is_platform_owner() or (company_id is not null and public.is_company_member(company_id)));

create policy "Users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "Users update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Owner reads all notifications" on public.notifications
  for select to authenticated using (public.is_platform_owner());

create policy "Users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'platform_owner'));

create or replace function public.record_change_history()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  c uuid;
begin
  c := coalesce(new.company_id, old.company_id);
  insert into public.change_history (company_id, table_name, record_id, actor_user_id, action, changes)
  values (
    c, 'frontdesk_leads', coalesce(new.id, old.id), actor,
    case tg_op when 'INSERT' then 'created' else 'updated' end,
    case tg_op when 'UPDATE' then
      to_jsonb((select jsonb_object_agg(key, new_val) from (
        select key, new_val from (
          select key, to_jsonb(new) -> key as new_val, to_jsonb(old) -> key as old_val
          from jsonb_each(to_jsonb(new))
        ) d where old_val is distinct from new_val and key not in ('updated_at')
      ) s))
    else null end
  );
  return null;
end;
$$;

create trigger frontdesk_leads_history
after insert or update on public.frontdesk_leads
for each row execute function public.record_change_history();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger companies_touch before update on public.companies
for each row execute function public.touch_updated_at();
create trigger company_settings_touch before update on public.company_settings
for each row execute function public.touch_updated_at();

create index frontdesk_leads_company_idx on public.frontdesk_leads (company_id, created_at desc);
create index frontdesk_leads_assignment_idx on public.frontdesk_leads (assignment_status);
create index memberships_user_idx on public.company_memberships (user_id);
create index notes_lead_idx on public.enquiry_notes (lead_id);
create index history_company_idx on public.change_history (company_id, created_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);