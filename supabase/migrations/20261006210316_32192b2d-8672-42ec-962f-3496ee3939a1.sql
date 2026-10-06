create or replace function public.get_my_portal_access()
returns jsonb language sql stable security invoker set search_path to 'public'
as $$
  select jsonb_build_object(
    'is_owner', exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'platform_owner'),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('company_id', m.company_id, 'role', m.role, 'status', m.status))
       from public.company_memberships m where m.user_id = auth.uid()), '[]'::jsonb)
  )
$$;