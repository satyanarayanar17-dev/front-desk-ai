# Callwoven roadmap

## Implemented and published on callwoven.com
- [x] Approved blush/powder-blue design and smaller animated page-transition logo.
- [x] Separate owner and client email/password login, Forgot password, and Change password.
- [x] Owner-created manager/employee logins with temporary credentials and backend-enforced password replacement.
- [x] Company controls: employee limits, features, assistant and phone mapping.
- [x] Managers assign calls to employees; employees see only assigned calls.
- [x] Transcript analysis via direct OpenAI: reviewed summary, follow-up actions, needs, urgency, budget and timeline.
- [x] Tenant isolation, owner-controlled settings, seat enforcement, and change history.
- [x] Build/type checks and rollback database authorization checks.

## Remaining setup
- [ ] Set OPENAI_API_KEY as a server-only runtime secret.
- [ ] Configure custom SMTP for external client password-reset delivery.
- [ ] Run real signed-in onboarding and recovery end-to-end checks after sender setup.

See PORTAL-INTEGRATION.md for database migration provenance, validation and limitations. Existing records and production Vapi routing are preserved.
