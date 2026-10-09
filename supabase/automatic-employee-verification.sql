begin;
insert into auth.users(id,email) values
('11111111-0000-0000-0000-000000000011','cw-team-manager@example.invalid'),
('11111111-0000-0000-0000-000000000012','cw-team-one@example.invalid'),
('11111111-0000-0000-0000-000000000013','cw-team-two@example.invalid'),
('11111111-0000-0000-0000-000000000014','cw-team-four@example.invalid');
insert into public.companies(id,name,slug,status) values('22222222-0000-0000-0000-000000000011','Team verification','cw-team-verification','pilot');
insert into public.company_settings(company_id,seat_limit) values('22222222-0000-0000-0000-000000000011',3);
insert into public.company_memberships(company_id,user_id,role,status) values('22222222-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000011','manager','active');
insert into public.company_invitations(company_id,email,role,status) values('22222222-0000-0000-0000-000000000011','cw-team-one@example.invalid','employee','recorded');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select public.enrol_password_client('22222222-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000012','11111111-0000-0000-0000-000000000011','employee');
select public.enrol_password_client('22222222-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000013','11111111-0000-0000-0000-000000000011','employee');
do $$ begin
 begin
  perform public.enrol_password_client('22222222-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000014','11111111-0000-0000-0000-000000000011','employee');
  raise exception 'Fourth person was allowed';
 exception when check_violation then null; end;
 begin
  perform public.enrol_password_client('22222222-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000014','11111111-0000-0000-0000-000000000011','manager');
  raise exception 'Manager could grant manager role';
 exception when insufficient_privilege then null; end;
 begin
  perform public.enrol_password_client('22222222-0000-0000-0000-000000000012','11111111-0000-0000-0000-000000000014','11111111-0000-0000-0000-000000000011','employee');
  raise exception 'Manager could enroll another company';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.company_memberships where company_id='22222222-0000-0000-0000-000000000011')<>3 then raise exception 'Wrong total'; end if;
 if not exists(select 1 from private.password_onboarding where user_id='11111111-0000-0000-0000-000000000012' and required) then raise exception 'Missing password gate'; end if;
 if exists(select 1 from private.password_onboarding where user_id='11111111-0000-0000-0000-000000000014') then raise exception 'Failed enrolment left data'; end if;
 if not exists(select 1 from public.company_invitations where company_id='22222222-0000-0000-0000-000000000011' and status='accepted') then raise exception 'Reservation not consumed'; end if;
end $$;
select 'PASS: manager + two employees; fourth blocked; cross-company and role escalation denied; reservation consumed; password gate preserved' as verification;
rollback;
