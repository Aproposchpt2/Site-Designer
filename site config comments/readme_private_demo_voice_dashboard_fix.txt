FLOWDESK PRO — PRIVATE DEMO VOICE DASHBOARD FIX

Purpose:
Fix the current private demo dashboard that says "Waiting for your call..." even though the AI Voice Attendant greeting works.

Root cause:
The private demo dashboard reads from the `leads` table and filters by `demo_ref`.
The new AI Voice Attendant function was saving to `flowdesk_intake_records`, so the private dashboard never saw the record.
Also, the old dashboard filter compared caller_name to the business name, which can hide valid calls.

Replace these files:
1. netlify/functions/flowdesk-voice-webhook.js
2. netlify/functions/flowdesk-voice-intake.js
3. demo-dashboard.html
4. demo.html

What changed:
- Voice greeting is simplified:
  "Thank you for calling {Business Name}. Please give me your first and last name and the reason for your call."

- No press-1/press-2 IVR menu in this demo.

- flowdesk-voice-intake now writes to BOTH:
  a) flowdesk_intake_records
  b) leads

- The `leads` record includes:
  is_demo = true
  demo_ref = matched demo_requests.ref_slug
  caller_name/full_name
  summary/intent
  caller_phone
  urgency
  call_sid

- demo-dashboard.html now prioritizes matching by demo_ref instead of trying to match caller_name to the business name.

Test order:
1. Deploy these 4 files.
2. Submit demo request with your business name and phone.
3. Use the generated private demo link.
4. Call the Twilio number from the same phone number submitted in the demo request.
5. Say: "My name is [First Last]. I am calling because [reason]."
6. Wait for confirmation.
7. The private demo dashboard should populate from the `leads` record.

Twilio voice webhook remains:
https://aiflowdeskpro.com/.netlify/functions/flowdesk-voice-webhook
Method: POST
