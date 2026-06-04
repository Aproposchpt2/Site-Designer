FLOWDESK PRO — STANDALONE AI VOICE ATTENDANT DASHBOARD PATCH

This patch leaves the Lead Manager out.

Replace/add only these files:

1. Replace:
   demo-voice.html

2. Replace:
   netlify/functions/flowdesk-voice-webhook.js

3. Replace:
   netlify/functions/flowdesk-voice-intake.js

4. Add:
   netlify/functions/flowdesk-voice-records.js

5. Add:
   netlify/functions/flowdesk-voice-health.js

Purpose:
- Stabilize the AI Voice Attendant demo by itself.
- Save voice call records into public.flowdesk_intake_records.
- Display only AI Voice Attendant records on demo-voice.html.
- Do not link the demo to the Lead Manager during this phase.
- Use caller phone lookup against demo_requests to greet by submitted business name when available.

Required Twilio Voice webhook:
https://aiflowdeskpro.com/.netlify/functions/flowdesk-voice-webhook
Method: POST

Testing:
1. Deploy.
2. Open /demo-voice.html.
3. Click "Check Health" on the Attendant Dashboard.
4. Confirm Supabase variables and tableRead are OK.
5. Call (702) 710-2622.
6. Speak or press 1/2/3.
7. Refresh /demo-voice.html and confirm the call record appears in the Attendant Dashboard.

This patch does not touch:
- flowdesk-lead-manager-dashboard.html
- flowdesk-leads.js
- SMS
- Stripe
- AI4 Website Design
- AI4 Academy
