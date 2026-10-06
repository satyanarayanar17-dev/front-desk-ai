-- Append to the existing rollback fixtures.
reset role;
insert into private.password_onboarding(user_id) values ('11111111-0000-0000-0000-000000000004');
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if not public.get_my_password_state() then raise exception 'Temporary account not flagged'; end if;
 if exists(select 1 from public.frontdesk_leads) or exists(select 1 from public.call_analyses) or exists(select 1 from public.company_settings) or exists(select 1 from public.company_memberships) then raise exception 'Temporary password bypassed RLS'; end if;
 begin
  update private.password_onboarding set required=false where user_id=auth.uid();
  raise exception 'Client can clear password flag';
 exception when insufficient_privilege then null; end;
 begin
  perform public.enrol_password_client('22222222-0000-0000-0000-000000000001',auth.uid(),auth.uid(),'manager');
  raise exception 'Client can provision accounts';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Non-password profile changes must not unlock data.
update auth.users set raw_user_meta_data='{"password_change_required":false}' where id='11111111-0000-0000-0000-000000000004';
do $$ begin
 if not exists(select 1 from private.password_onboarding where user_id='11111111-0000-0000-0000-000000000004' and required) then raise exception 'Metadata unlocked account'; end if;
end $$;
-- Only a synthetic Auth password-column change invokes the production trigger.
update auth.users set encrypted_password='synthetic-test-hash-never-used-for-auth' where id='11111111-0000-0000-0000-000000000004';
set local role authenticated;
do $$ begin
 if public.get_my_password_state() or (select count(*) from public.frontdesk_leads)<>1 then raise exception 'Password replacement failed to unlock assigned call'; end if;
end $$;
reset role;
insert into auth.users(id,email) values
 ('11111111-0000-0000-0000-000000000005','cw-owner@example.invalid'),
 ('11111111-0000-0000-0000-000000000006','cw-new-manager@example.invalid'),
 ('11111111-0000-0000-0000-000000000007','cw-new-employee@example.invalid');
insert into public.user_roles(user_id,role) values ('11111111-0000-0000-0000-000000000005','platform_owner');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select public.enrol_password_client('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000006','11111111-0000-0000-0000-000000000005','manager');
reset role;
do $$ begin
 if not exists(select 1 from private.password_onboarding where user_id='11111111-0000-0000-0000-000000000006' and required) or not exists(select 1 from public.company_memberships where user_id='11111111-0000-0000-0000-000000000006' and role='manager') then raise exception 'Provisioning not atomic'; end if;
end $$;
update public.company_settings set seat_limit=2 where company_id='22222222-0000-0000-0000-000000000001';
set local role service_role;
do $$ begin
 begin
  perform public.enrol_password_client('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000005','employee');
  raise exception 'Provisioning bypassed employee limit';
 exception when check_violation then null; end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from private.password_onboarding where user_id='11111111-0000-0000-0000-000000000007') then raise exception 'Failed enrolment left flag'; end if;
end $$;
