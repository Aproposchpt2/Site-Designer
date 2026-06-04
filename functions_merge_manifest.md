# FlowDesk Pro — Merged netlify/functions/ Manifest
# Produced: 2026-05-15
# Mission: Merge FLOWDESKPRO AI VOICE ATTENDANT DEMO into LIVE_AIFLOWDESKPRO_COM

## FINAL MERGED FILE LIST
## Deploy order: copy all to netlify/functions/ — conflicts resolved per notes below.

netlify/functions/
├── call.js                     ← REPLACE (29KB from VOICE DEMO — kills 85-byte stub)
├── demo-request.js             ← ADD (from VOICE DEMO — handles demo-request.html form)
├── auth-claim.js               ← ADD (from VOICE DEMO — dashboard token claim)
├── auth-login.js               ← ADD (from VOICE DEMO — dashboard login flow)
├── stripe-webhook.js           ← ADD (from VOICE DEMO — Stripe payment webhook)
├── submit.js                   ← ADD (from VOICE DEMO — lead submission + normalization)
├── config.js                   ← CONFLICT — see note below
├── flowdesk-config.js          ← KEEP (from LIVE SITE — serves Twilio config to index.html)
├── flowdesk-email-lead.js      ← KEEP (from LIVE SITE — Resend lead email)
├── flowdesk-leads.js           ← KEEP (from LIVE SITE — Supabase leads read)
├── flowdesk-submit-intake.js   ← KEEP (from LIVE SITE — intake form submission)
├── flowdesk-sms-webhook.js     ← KEEP (from LIVE SITE — Twilio SMS inbound)
├── flowdesk-voice-webhook.js   ← KEEP (from LIVE SITE — Twilio Voice webhook)
├── flowdesk-voice-intake.js    ← KEEP (from LIVE SITE — voice intake processor)
├── flowdesk-update-lead.js     ← KEEP (from LIVE SITE — lead status updates)

---

## CONFLICT NOTES

### ⚠️ CONFLICT: config.js

VOICE DEMO has:          netlify/functions/config.js (1,292 bytes)
LIVE SITE has:           netlify/functions/flowdesk-config.js (1,314 bytes)

These are different files serving different purposes:
- config.js (DEMO)         → Serves Supabase URL + anon key to dashboard.html and demo-dashboard.html
- flowdesk-config.js (LIVE)→ Serves Twilio phone number, voice/SMS webhook URLs to index.html

RESOLUTION:
- Keep BOTH files under their separate names.
- config.js serves the AI Voice Attendant demo flow (demo.html, demo-dashboard.html, dashboard.html)
- flowdesk-config.js serves the live site Twilio panel

ACTION: No rename needed. Deploy both. No collision.

---

### ✅ SAFE REPLACE: call.js

LIVE SITE:  netlify/functions/call.js = 85 bytes (stub — does nothing)
VOICE DEMO: netlify/functions/call.js = 29,825 bytes (full production function)

The 29KB call.js from the VOICE DEMO folder (netlify/functions/call.js) is the authoritative
production version. It handles:
  - Twilio TwiML gather/response flow
  - Speech-to-text transcript capture
  - Claude API lead extraction
  - Supabase leads + call_logs writes
  - Demo lookup by caller phone (matches demo_requests table → populates demo dashboard)
  - Missed call email alerts via Resend
  - Urgent SMS path

ACTION: Replace the stub immediately. This is a direct copy — no merge required.

---

### ✅ NEW ADDS (no conflicts): demo-request.js, auth-claim.js, auth-login.js, stripe-webhook.js, submit.js

These files exist only in the VOICE DEMO and are required for:
  - demo-request.html to submit to Supabase (demo-request.js)
  - dashboard.html auth flow (auth-claim.js, auth-login.js)
  - Stripe payment confirmation → Supabase subscriptions table (stripe-webhook.js)
  - Lead form submission normalization (submit.js)

ACTION: Copy all five directly into netlify/functions/. No conflicts with live site.

---

## ENVIRONMENT VARIABLES REQUIRED (Netlify Dashboard)

Shared by both sites — confirm all are set in production:

  ANTHROPIC_API_KEY             ← Claude API (call.js lead extraction)
  SUPABASE_URL                  ← Supabase project URL
  SUPABASE_SERVICE_KEY          ← Supabase service role key (server-side)
  SUPABASE_ANON_KEY             ← Supabase anon key (client-accessible via config.js)
  TWILIO_ACCOUNT_SID            ← Twilio credentials
  TWILIO_AUTH_TOKEN             ← Twilio credentials
  TWILIO_PHONE_NUMBER           ← E.164 format: +17027102622
  FLOWDESK_PUBLIC_TWILIO_NUMBER ← Same as above (used by flowdesk-config.js)
  RESEND_API_KEY                ← Resend email API key
  RESEND_FROM_EMAIL             ← Verified sender address
  RESEND_TO_EMAIL               ← Owner notification recipient
  STRIPE_SECRET_KEY             ← Stripe secret (stripe-webhook.js)
  STRIPE_WEBHOOK_SECRET         ← Stripe webhook signing secret
  FLOWDESK_SITE_URL             ← https://aiflowdeskpro.com
  FLOWDESK_INTAKE_TABLE         ← flowdesk_intake_records
  JWT_SECRET                    ← Auth token signing (auth-claim.js, auth-login.js)

---

## SUPABASE TABLES REQUIRED

Confirm all exist in production Supabase project:

  leads                  ← AI Voice call leads (call.js writes here)
  call_logs              ← Full call transcripts (call.js writes here)
  demo_requests          ← Personalized demo records (demo-request.js writes here)
  flowdesk_intake_records← Web intake form submissions (flowdesk-submit-intake.js writes here)
  clients                ← Onboarded client records
  agencies               ← White-label agency records
  portal_users           ← Dashboard auth users
  subscriptions          ← Stripe subscription records (stripe-webhook.js writes here)

---

## ROUTING FIXES (netlify.toml additions)

Add to netlify.toml to fix the Lead Manager redirect and clean up routes:

  [[redirects]]
  from = "/leads"
  to = "/flowdesk-lead-manager-dashboard.html"
  status = 200

  [[redirects]]
  from = "/lead-manager"
  to = "/flowdesk-lead-manager-dashboard.html"
  status = 200

  [[redirects]]
  from = "/intake"
  to = "/flowdesk-intake-engine.html"
  status = 200

  [[redirects]]
  from = "/voice"
  to = "/demo-voice.html"
  status = 200

---

## DEPLOYMENT CHECKLIST

[ ] 1. Replace netlify/functions/call.js with 29KB version from VOICE DEMO folder
[ ] 2. Copy 5 new functions: demo-request.js, auth-claim.js, auth-login.js, stripe-webhook.js, submit.js
[ ] 3. Confirm all environment variables set in Netlify dashboard
[ ] 4. Deploy new root HTML files: index.html, demo-voice.html, demo-leads.html, demo-intake.html
[ ] 5. Keep existing: demo.html, demo-request.html, demo-dashboard.html, dashboard.html, welcome.html
[ ] 6. Keep existing: flowdesk-intake-engine.html, flowdesk-lead-manager-dashboard.html
[ ] 7. Update netlify.toml with redirect rules above
[ ] 8. Verify Twilio webhook URL points to: https://aiflowdeskpro.com/.netlify/functions/call
[ ] 9. Test demo flow: demo-request.html → call (702) 710-2622 → demo-dashboard.html populates
[ ] 10. Test Lead Manager: navigate to /leads or /lead-manager → flowdesk-lead-manager-dashboard.html
