// generate-bg.mjs — Netlify Background Function
// Returns job_id immediately, runs Claude in background, writes result to Supabase
// Deploy to: netlify/functions/generate-bg.mjs
// Netlify background functions run up to 15 minutes — no timeout issue

import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function buildPrompt(a) {
  const contact = [
    a.phone     ? `Phone: ${a.phone}`         : null,
    a.email     ? `Email: ${a.email}`         : null,
    a.addr      ? `Address: ${a.addr}`        : null,
    a.site      ? `Website: ${a.site}`        : null,
    a.facebook  ? `Facebook: ${a.facebook}`   : null,
    a.instagram ? `Instagram: ${a.instagram}` : null,
    a.tiktok    ? `TikTok: ${a.tiktok}`       : null,
    a.youtube   ? `YouTube: ${a.youtube}`     : null,
    a.linkedin  ? `LinkedIn: ${a.linkedin}`   : null,
  ].filter(Boolean).join('\n');

  return `You are a world-class marketing agency creative director and web designer.

Build a COMPLETE, UNIQUE, PRODUCTION-READY promotional website as a single HTML file.

CLIENT BRIEF:
Business Name: ${a.name || 'Your Business'}
What They Do: ${a.what || 'Not specified'}
Ideal Customers: ${a.who || 'Not specified'}
What Makes Them Different: ${a.diff || 'Not specified'}
Additional Notes: ${a.else || 'None'}
Contact:
${contact || 'None provided'}

RULES:
- Invent a completely unique visual identity for THIS business and industry
- Write real specific copy — zero placeholder text, zero generic phrases
- A barbershop must not look like a law firm
- Include all contact details as clickable links
- Mobile responsive
- Contact form: <form name="contact" method="POST" data-netlify="true">
- Sections: Nav + Hero + Services + Why Choose Them + Contact + Footer

Return ONLY the HTML. Start with <!DOCTYPE html>. No markdown.`;
}

async function createJob() {
  const id = crypto.randomUUID();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ id, status: 'pending', html: null })
  });
  if (!res.ok) throw new Error('Could not create job in Supabase');
  return id;
}

async function updateJob(id, status, html = null) {
  await fetch(`${SUPABASE_URL}/rest/v1/site_jobs?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    body: JSON.stringify({ status, html })
  });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: 'Method not allowed' };

  const { answers } = JSON.parse(event.body || '{}');

  // Create job row in Supabase — this is instant
  const jobId = await createJob();

  // Return job_id to browser immediately — don't await Claude
  // The background function continues running after the response is sent
  setImmediate(async () => {
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildPrompt(answers) }]
      });

      let html = response.content[0].text.trim()
        .replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

      await updateJob(jobId, 'done', html);
      console.log('[generate-bg] Job', jobId, 'completed');
    } catch(err) {
      console.error('[generate-bg] Job', jobId, 'failed:', err.message);
      await updateJob(jobId, 'error', null);
    }
  });

  return {
    statusCode: 202,
    headers: HEADERS,
    body: JSON.stringify({ jobId, status: 'pending' })
  };
};
