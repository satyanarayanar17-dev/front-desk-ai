# Callwoven portal integration — 2026-10-06 UTC

Compared production source fa82d66e7d2abef5af9e11984dee686be92a0f25 with satyanarayanar17-dev/front-desk-ai commit 90d07a5236817d5a5065eabf774875a111ae4435.

Imported owner/client login, backend role lookup, companies and history pages, manager and employee portals, enquiry company assignment, and additional type definitions. Kept production Supabase project gtlfkvsqkxyktxqjgrbs, hosting configuration, original marketing pages, design, small PageTransition loader, existing Vapi edge-function URL, dependencies and lockfile. Did not import the new Lovable Cloud client, environment file, fail-open webhook, server middleware or package changes.

Integration fixes: role-based routing through the existing exact /dashboard/leads magic-link callback; manager settings are read-only; manager enquiry assignment to active employees; employee assignment scope enforced in RLS; disabled lead/note features and paused companies block backend access; managers cannot grant manager roles; pending invitations and active employees count toward a serialized allowance; member updates cannot change caller fields/company; company settings, memberships and invitations have audit history. No calls or historical records were reassigned.

Applied Supabase migration callwoven_portal_integration_hardening. SQL source is supabase/portal-integration-hardening.sql. Verified before and after application using supabase/portal-integration-verification.sql in transactions that rolled back all synthetic companies, users, memberships, enquiries, notes and invitations. Checks cover tenant isolation, assigned-only employee access, manager settings protection, assignment, employee and pending-invitation limits, manager-role escalation, disabled features, paused companies and deactivation. No real invitation email, number purchase or call routing action occurred.

Build, TypeScript and whitespace checks passed. Security advisor shows only pre-existing webhook-secret RLS information (no client policies is intentional) and disabled leaked-password protection. Password protection guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Remaining work: real invitation delivery and account provisioning, human-readable employee names, manual enquiry creation, notification UI and verified provider usage reporting. Recorded invitations reserve seats and do not create auth users or send mail. Company/number mappings are metadata here; automatic live webhook routing remains the existing integration. End-to-end email delivery and signed-in browser flows have not been verified. Concurrent allowance protection uses a shared transaction advisory lock; the verification checks limits serially, not with parallel database sessions.

## Transcript analysis update

Added manager transcript input, AI Gateway summary/follow-up/needs/urgency/budget/timeline extraction, evidence quotes, explicit unknown values, draft review and separate saved analysis records. Employees can read saved analyses only for assigned calls. Owner ai_analysis switch blocks generation and saving. Server validates the Supabase bearer token, manager membership, accessible company call and features before model invocation and rechecks access afterward. Uses Lovable AI Gateway google/gemini-3.7-flash; bounded input/output, 45s timeout, 30 requests/company/hour database quota and clear 402/429/missing-key/invalid-output errors. No messages, appointment bookings, priority changes or assignment are generated automatically.

Applied callwoven_transcript_analysis migration. Before/after rollback SQL checks cover saved analysis isolation, employee write denial, assignment transfer and access revocation, quota and feature enforcement. Endpoint tests mock every network call; they cover unauthorized access, employees, foreign company calls, disabled feature, missing key, bad input, quota, gateway errors and malformed/evidence-free responses. Built Worker GET/POST checks verify endpoint routing and anonymous denial. No real model inference, live email login or signed-in browser UI was tested. Runtime AI Gateway secret LOVABLE_API_KEY is not configured on the Site, so generation is pending credential setup. Do not store that key in client variables, source files or chat.

For activation: configure LOVABLE_API_KEY as a secret runtime variable on the existing Callwoven Site and redeploy its saved version. The server reads Cloudflare bindings from Nitro's request runtime, with the direct handler environment as fallback. The generated client contains no provider credential or model invocation code.


## Direct OpenAI provider switch

Replaced Lovable AI Gateway with OpenAI Chat Completions, pinned gpt-4.1-mini-2025-04-14, strict JSON schema, store:false and server-only OPENAI_API_KEY. Existing saved analysis model labels remain unchanged. Removed Lovable headers/key use from implementation and tests. Preserved access checks, review flow, quota and assignment controls. Runtime OPENAI_API_KEY is still absent, so real inference is not active. Configure it securely as the existing Site's runtime secret, then redeploy. Endpoint tests use synthetic credentials and mocked OpenAI responses; no real API call or spend occurred.

## Password login and client onboarding

Owner, client and legacy login forms now use email/password, with a password-reset request form. The existing allowed `/dashboard/leads` recovery callback routes recovery sessions to `/change-password`. Owners with earlier passwordless accounts can use Forgot password to set their first password; existing sessions are retained.

Owners create manager/employee accounts from Companies → company → Create client login. The `create-client-login` Supabase Edge Function has platform JWT verification enabled, verifies the session with Auth, checks backend owner role and password state, and creates accounts via the server-only Auth Admin API. It returns cryptographically generated temporary credentials once, with no-store responses. No invitation emails are sent. Duplicate emails never overwrite an existing account. Failed enrollment compensates by deleting the newly created Auth user; cleanup failures report an incomplete setup.

Enrollment sets a private required-password-change flag, consumes a matching recorded invitation and inserts membership in one transaction. Existing employee allowance triggers apply. A restricted Auth password-column trigger clears the flag only after password replacement; user metadata cannot clear it. Restrictive RLS policies deny company data and portal writes until replacement, and manager quota helpers also check readiness. Existing tenant/assignment restrictions continue after unlocking. No plaintext temporary password is stored in application tables or logs.

Validation: production build and TypeScript checks; mock handler authorization/input/duplicate/cleanup/credential tests; rollback SQL checks for direct API denial, metadata bypass denial, password-trigger unlock, service-only atomic enrollment and employee seat limits, alongside earlier tenant/assignment/AI tests. No real client account, password-reset email or invitation was created/sent during verification. Actual end-to-end email delivery remains untested.

Remaining setup: custom SMTP is not configured. Supabase's built-in sender is limited to project team addresses and a low hourly rate; external client password resets require a proper SMTP sender. Existing leaked-password-protection warning remains. Direct OpenAI AI analysis separately still requires the OPENAI_API_KEY site secret.

## GitHub source synchronization

Synced the published Callwoven application changes into front-desk-ai while retaining Lovable project metadata, dependency definitions, existing integration files and history. Sites hosting metadata is not exported. The repository's separate legacy same-origin Vapi webhook now rejects POSTs when VAPI_WEBHOOK_SECRET is absent, instead of accepting unauthenticated writes. This does not change the live Supabase Vapi webhook or its routing. Existing routing tests are extended for password replacement/recovery.

GitHub checkout verification: production build, TypeScript check, 14 Vitest tests (routing, password state/recovery and legacy webhook authentication), plus both mocked onboarding/AI endpoint suites passed. No real client account, email or model call was used.
