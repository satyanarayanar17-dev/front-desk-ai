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

create table public.frontdesk_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vapi_call_id text unique,
  event_type text,
  assistant_id text,
  structured_output_name text,
  caller_name text,
  caller_phone text,
  postcode text,
  full_address text,
  existing_customer boolean,
  service_category text,
  issue_summary text,
  urgency text,
  property_type text,
  boiler_make_model text,
  boiler_error_code text,
  has_active_leak boolean,
  leak_contained boolean,
  no_heating boolean,
  no_hot_water boolean,
  suspected_gas_leak boolean,
  carbon_monoxide_concern boolean,
  drainage_blockage boolean,
  vulnerable_occupant boolean,
  vulnerable_occupant_notes text,
  preferred_date text,
  preferred_time text,
  caller_role text,
  consent_to_callback boolean,
  call_summary text,
  recommended_business_action text,
  status text default 'new',
  raw_payload jsonb,
  company_id uuid references public.companies(id) on delete set null,
  assignment_status text not null default 'unmatched' check (assignment_status in ('unmatched','assigned','quarantined')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz,
  match_reason text
);

create table public.frontdesk_pilot_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text,
  contact_name text,
  email text,
  phone text,
  website text,
  city text,
  calls_per_week text,
  notes text,
  status text default 'new'
);

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

-- ===== access helper functions (security definer, no RLS recursion) =====
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

-- ===== grants =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_memberships TO authenticated;
GRANT SELECT, UPDATE ON public.company_settings TO authenticated;
GRANT SELECT, UPDATE ON public.frontdesk_leads TO authenticated;
GRANT SELECT ON public.frontdesk_pilot_interests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiry_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.company_invitations TO authenticated;
GRANT SELECT, INSERT ON public.change_history TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ===== row level security =====
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frontdesk_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frontdesk_pilot_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- companies
create policy "Owner full access to companies" on public.companies
  for all to authenticated using (public.is_platform_owner()) with check (public.is_platform_owner());
create policy "Members read their company" on public.companies
  for select to authenticated using (public.is_company_member(id));

-- memberships
create policy "Members read their company memberships" on public.company_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_company_manager(company_id) or public.is_platform_owner());
create policy "Managers and owner manage memberships" on public.company_memberships
  for all to authenticated
  using (public.is_company_manager(company_id) or public.is_platform_owner())
  with check (public.is_company_manager(company_id) or public.is_platform_owner());

-- settings
create policy "Members read their company settings" on public.company_settings
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_owner());
create policy "Managers and owner update settings" on public.company_settings
  for update to authenticated
  using (public.is_company_manager(company_id) or public.is_platform_owner())
  with check (public.is_company_manager(company_id) or public.is_platform_owner());
create policy "Owner inserts settings" on public.company_settings
  for insert to authenticated with check (public.is_platform_owner());

-- leads
create policy "Owner sees all leads" on public.frontdesk_leads
  for select to authenticated using (public.is_platform_owner());
create policy "Members see their company leads" on public.frontdesk_leads
  for select to authenticated using (company_id is not null and public.is_company_member(company_id));
create policy "Owner updates all leads" on public.frontdesk_leads
  for update to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());
create policy "Members update their company leads" on public.frontdesk_leads
  for update to authenticated
  using (company_id is not null and public.is_company_member(company_id))
  with check (company_id is not null and public.is_company_member(company_id));

-- pilot interests
create policy "Owner manages pilot interests" on public.frontdesk_pilot_interests
  for all to authenticated using (public.is_platform_owner()) with check (public.is_platform_owner());

-- enquiry notes
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

-- invitations
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

-- change history
create policy "Members read their company history" on public.change_history
  for select to authenticated
  using (public.is_platform_owner() or (company_id is not null and public.is_company_member(company_id)));

-- notifications
create policy "Users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "Users update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Owner reads all notifications" on public.notifications
  for select to authenticated using (public.is_platform_owner());

-- user roles
create policy "Users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'platform_owner'));

-- ===== change history trigger (security definer, writes bypass RLS) =====
create or replace function public.record_change_history()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  c uuid;
begin
  select company_id into c from public.frontdesk_leads where id = coalesce(new.id, old.id);
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

-- ===== updated_at triggers =====
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
create trigger leads_touch before update on public.frontdesk_leads
for each row execute function public.touch_updated_at();

-- ===== realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.frontdesk_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.frontdesk_pilot_interests;

-- ===== indexes =====
create index frontdesk_leads_company_idx on public.frontdesk_leads (company_id, created_at desc);
create index frontdesk_leads_assignment_idx on public.frontdesk_leads (assignment_status);
create index memberships_user_idx on public.company_memberships (user_id);
create index notes_lead_idx on public.enquiry_notes (lead_id);
create index history_company_idx on public.change_history (company_id, created_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);