alter table public.company_invitations drop constraint company_invitations_status_check;
alter table public.company_invitations add constraint company_invitations_status_check check(status in ('recorded','accepted','cancelled'));
