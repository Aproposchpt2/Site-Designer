FLOWDESK PRO — PRIVATE DEMO DASHBOARD SERVER-SIDE FETCH PATCH

Issue:
The AI Voice Attendant greeting is working, but demo.html?ref=apropos-group-llc still shows "Waiting for your call."

Answer to question:
No, the Twilio function does not call the browser URL:
https://aiflowdeskpro.com/demo.html?ref=apropos-group-llc

The browser page polls Supabase/records and displays what was saved. Twilio calls:
https://aiflowdeskpro.com/.netlify/functions/flowdesk-voice-webhook
then
https://aiflowdeskpro.com/.netlify/functions/flowdesk-voice-intake

Probable issue:
The private dashboard was reading Supabase directly from the browser and using client-side filters/realtime. This can hide valid records because of RLS, anon-key access, timestamp filtering, or demo_ref/name filtering.

Patch:
1. Adds server-side function:
   netlify/functions/flowdesk-private-demo-leads.js

2. Replaces:
   demo-dashboard.html

The new dashboard calls:
   /.netlify/functions/flowdesk-private-demo-leads?ref=apropos-group-llc&since=...

The function uses the service role key server-side and fetches:
   leads where is_demo=true and demo_ref=apropos-group-llc

It also falls back without the since filter if no records are found.

Replace/add only:
1. demo-dashboard.html
2. netlify/functions/flowdesk-private-demo-leads.js

Do not change:
- Twilio webhook URL
- flowdesk-voice-webhook.js
- flowdesk-voice-intake.js
- Lead Manager
- SMS

Fast test after deploy:
Open:
https://aiflowdeskpro.com/.netlify/functions/flowdesk-private-demo-leads?ref=apropos-group-llc

Expected:
JSON with ok:true and records array.
If records is empty, the voice intake is not saving a lead row with demo_ref=apropos-group-llc.
