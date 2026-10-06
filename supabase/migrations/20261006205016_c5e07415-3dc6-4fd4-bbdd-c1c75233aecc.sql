insert into public.user_roles (user_id, role)
select u.id, 'platform_owner'::app_role from auth.users u
where lower(u.email) in ('satyanarayanareddy.tethala@gmail.com','satyanarayanareddy.job@gmail.com')
and not exists (select 1 from public.user_roles r where r.user_id=u.id and r.role='platform_owner');

create or replace function private.is_platform_owner()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select private.has_role(auth.uid(), 'platform_owner') $$;

create or replace function public.get_my_portal_access()
returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_build_object(
    'is_owner', private.has_role(auth.uid(), 'platform_owner'),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('company_id', m.company_id, 'role', m.role, 'status', m.status))
       from public.company_memberships m where m.user_id = auth.uid()), '[]'::jsonb)
  )
$$;
revoke execute on function public.get_my_portal_access() from public, anon;
grant execute on function public.get_my_portal_access() to authenticated;