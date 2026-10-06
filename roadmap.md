# Roadmap

## Client portal & platform-owner experience (current work)
- [x] Fresh Lovable Cloud schema mirroring frontdesk_* identifiers, portal tables, roles, RLS, triggers, realtime.
- [x] Owner dashboard: leads, pilots, companies (create, settings, seat limit, features, assistant/phone mapping).
- [x] Manager portal: calls, team, settings, history.
- [x] Employee portal: calls, notes, status updates.
- [x] Vapi call webhook route: secret check, duplicate skip, company mapping, unmatched review.
- [x] Build + typecheck clean, routing tests pass.
- [ ] Signed-in end-to-end verification — blocked: backend has no auth users yet; someone must sign up via the login page first.

## Follow-ups
- [ ] Configure Vapi webhook secret (VAPI_WEBHOOK_SECRET) when the user provides it.
- [ ] Email sending for invitations/magic links — requires a transactional sender to be set up.
