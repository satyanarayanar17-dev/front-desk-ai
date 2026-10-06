-- Run after setup in an explicit transaction and always roll back.
insert into auth.users(id,email) values
 ('11111111-0000-0000-0000-000000000001','cw-test-manager@example.invalid'),
 ('11111111-0000-0000-0000-000000000002','cw-test-employee@example.invalid'),
 ('11111111-0000-0000-0000-000000000003','cw-test-other@example.invalid');
insert into public.companies(id,name,slug,status) values
 ('22222222-0000-0000-0000-000000000001','Rollback test A','cw-rollback-a','active'),
 ('22222222-0000-0000-0000-000000000002','Rollback test B','cw-rollback-b','active');
insert into public.company_settings(company_id,seat_limit,features) values
 ('22222222-0000-0000-0000-000000000001',1,'{"leads":true,"notes":true}'),
 ('22222222-0000-0000-0000-000000000002',1,'{"leads":true,"notes":true}');
insert into public.company_memberships(company_id,user_id,role) values
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','manager'),
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','employee'),
 ('22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003','employee');
insert into public.frontdesk_leads(id,company_id,assigned_employee_id,status) values
 ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','new'),
 ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001',null,'new'),
 ('33333333-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003','new');
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.frontdesk_leads)<>1 then raise exception 'Employee assignment or tenant isolation failed'; end if;
 update public.frontdesk_leads set status='closed' where id='33333333-0000-0000-0000-000000000001';
 begin
  update public.frontdesk_leads set caller_phone='changed' where id='33333333-0000-0000-0000-000000000001';
  raise exception 'Employee edited caller data';
 exception when insufficient_privilege then null; end;
 insert into public.enquiry_notes(lead_id,company_id,author_user_id,body) values
 ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',auth.uid(),'rollback note');
 begin
  insert into public.enquiry_notes(lead_id,company_id,author_user_id,body) values
  ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001',auth.uid(),'forbidden');
  raise exception 'Employee added note to unassigned enquiry';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.frontdesk_leads)<>2 then raise exception 'Manager tenant isolation failed'; end if;
 if (select count(*) from public.company_settings)<>1 then raise exception 'Settings isolation failed'; end if;
 update public.company_settings set seat_limit=100 where company_id='22222222-0000-0000-0000-000000000001';
 if (select seat_limit from public.company_settings limit 1)<>1 then raise exception 'Manager changed owner settings'; end if;
 update public.frontdesk_leads set assigned_employee_id='11111111-0000-0000-0000-000000000002' where id='33333333-0000-0000-0000-000000000002';
 begin
  insert into public.company_invitations(company_id,email,role) values ('22222222-0000-0000-0000-000000000001','cw-over-limit@example.invalid','employee');
  raise exception 'Employee limit not enforced';
 exception when check_violation then null; end;
 begin
  insert into public.company_invitations(company_id,email,role) values ('22222222-0000-0000-0000-000000000001','cw-manager@example.invalid','manager');
  raise exception 'Manager can invite another manager';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.company_settings set features='{"leads":false,"notes":false}' where company_id='22222222-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.frontdesk_leads) then raise exception 'Disabled leads still accessible'; end if;
 if exists(select 1 from public.enquiry_notes) then raise exception 'Disabled notes still accessible'; end if;
end $$;
reset role;
update public.company_settings set seat_limit=2 where company_id='22222222-0000-0000-0000-000000000002';
insert into public.company_invitations(company_id,email,role) values ('22222222-0000-0000-0000-000000000002','cw-pending@example.invalid','employee');
do $$ begin
 begin
  insert into public.company_invitations(company_id,email,role) values ('22222222-0000-0000-0000-000000000002','cw-extra@example.invalid','employee');
  raise exception 'Pending invitations not counted';
 exception when check_violation then null; end;
end $$;
update public.companies set status='paused' where id='22222222-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.frontdesk_leads) then raise exception 'Paused company still accessible'; end if;
 if exists(select 1 from public.change_history) then raise exception 'Paused company history still accessible'; end if;
end $$;
reset role;
update public.companies set status='active' where id='22222222-0000-0000-0000-000000000001';
update public.company_settings set features='{"leads":true,"notes":true}' where company_id='22222222-0000-0000-0000-000000000001';
update public.company_memberships set status='deactivated' where user_id='11111111-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.frontdesk_leads) then raise exception 'Deactivated manager still has access'; end if;
end $$;
reset role;
