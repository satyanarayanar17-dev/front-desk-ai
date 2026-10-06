drop policy if exists frontdesk_owner_select on public.frontdesk_leads;
drop policy if exists frontdesk_owner_update on public.frontdesk_leads;
drop policy if exists pilot_owner_select on public.frontdesk_pilot_interests;
drop policy if exists pilot_owner_update on public.frontdesk_pilot_interests;
create policy frontdesk_owner_select on public.frontdesk_leads for select to authenticated using (private.is_platform_owner());
create policy frontdesk_owner_update on public.frontdesk_leads for update to authenticated using (private.is_platform_owner()) with check (private.is_platform_owner());
create policy pilot_owner_select on public.frontdesk_pilot_interests for select to authenticated using (private.is_platform_owner());
create policy pilot_owner_update on public.frontdesk_pilot_interests for update to authenticated using (private.is_platform_owner()) with check (private.is_platform_owner());