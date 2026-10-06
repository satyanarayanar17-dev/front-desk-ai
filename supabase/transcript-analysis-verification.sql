-- Append after portal-integration-verification.sql, within a rollback transaction.
update public.company_memberships set status='active' where user_id='11111111-0000-0000-0000-000000000001';
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
insert into public.call_analyses(lead_id,company_id,created_by,transcript,analysis,model) values
 ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',auth.uid(),'Caller asks for a callback next week.','{"summary":"Callback requested"}','test');
do $$ begin
 begin
  insert into public.call_analyses(lead_id,company_id,created_by,transcript,analysis,model) values
  ('33333333-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001',auth.uid(),'Caller asks for a callback next week.','{}','test');
  raise exception 'Analysis attached across company boundary';
 exception when insufficient_privilege then null; end;
 for i in 1..30 loop perform public.reserve_transcript_analysis('22222222-0000-0000-0000-000000000001'); end loop;
 begin
  perform public.reserve_transcript_analysis('22222222-0000-0000-0000-000000000001');
  raise exception 'Quota did not reject request 31' using errcode='23514';
 exception when raise_exception then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.call_analyses)<>1 then raise exception 'Employee cannot read assigned analysis'; end if;
 begin
  perform public.reserve_transcript_analysis('22222222-0000-0000-0000-000000000001');
  raise exception 'Employee reserved paid analysis';
 exception when insufficient_privilege then null; end;
 update public.call_analyses set model='forbidden';
 if exists(select 1 from public.call_analyses where model='forbidden') then raise exception 'Employee edited analysis'; end if;
 begin
  update public.frontdesk_leads set assigned_employee_id=null where id='33333333-0000-0000-0000-000000000001';
  raise exception 'Employee removed own assignment';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Reassignment immediately removes the old employee's call and analysis access.
update public.company_settings set seat_limit=3 where company_id='22222222-0000-0000-0000-000000000001';
insert into auth.users(id,email) values('11111111-0000-0000-0000-000000000004','cw-second-employee@example.invalid');
insert into public.company_memberships(company_id,user_id,role) values('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','employee');
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
update public.frontdesk_leads set assigned_employee_id='11111111-0000-0000-0000-000000000004' where id='33333333-0000-0000-0000-000000000001';
reset role;
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.frontdesk_leads where id='33333333-0000-0000-0000-000000000001') or exists(select 1 from public.call_analyses) then raise exception 'Old employee retains reassigned call'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.frontdesk_leads)<>1 or (select count(*) from public.call_analyses)<>1 then raise exception 'New employee assignment failed'; end if;
end $$;
reset role;
update public.company_settings set features=features||'{"ai_analysis":false}' where company_id='22222222-0000-0000-0000-000000000001';
select set_config('request.jwt.claims','{"sub":"11111111-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin
  perform public.reserve_transcript_analysis('22222222-0000-0000-0000-000000000001');
  raise exception 'Disabled AI feature still callable';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
