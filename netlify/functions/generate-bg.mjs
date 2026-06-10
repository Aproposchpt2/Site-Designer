// netlify/functions/generate-bg.mjs
// Background Function — no timeout issue, runs up to 15 minutes
// Uses fetch (no SDK) to match generate.mjs — no package.json needed

const MODEL    = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const ANTH_KEY = process.env.ANTHROPIC_API_KEY;
const SUP_URL  = process.env.SUPABASE_URL;
const SUP_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const HEADERS = {
  "Content-Type":                "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":"Content-Type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

function buildPrompt(a) {
  const year = new Date().getFullYear();
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
  ].filter(Boolean).join("\n");

  return `You are a world-class marketing agency creative director and web designer combined.

A real client filled out an intake form. Build them a COMPLETE, UNIQUE, PRODUCTION-READY promotional website as a single HTML file.

CLIENT BRIEF:
Business Name: ${a.name || "Your Business"}
What They Do: ${a.what || "Not specified"}
Ideal Customers: ${a.who || "Not specified"}
What Makes Them Different: ${a.diff || "Not specified"}
Additional Notes: ${a.else || "None"}
Contact Information:
${contact || "None provided"}

YOUR MANDATE:
1. INVENT a completely unique visual identity — colors, fonts, layout — that fits THIS specific business and industry. Never use generic blue-white tech look for non-tech businesses.
2. WRITE real compelling copy specific to this business. Zero placeholder text. Zero generic phrases like "welcome to" or "dedicated to excellence."
3. DESIGN for their industry — a barbershop must look nothing like a law firm. A gospel artist must look nothing like a restaurant.
4. Include ALL contact details as clickable links in the contact section.
5. Mobile responsive with media queries.
6. Contact form: <form name="contact" method="POST" data-netlify="true"><input type="hidden" name="form-name" value="contact">
7. Footer: © ${year} ${a.name || "Your Business"}. All rights reserved.

SECTIONS: Navigation + Hero + Services + Why Choose Them + Contact + Footer

Return ONLY the complete HTML. Start with <!DOCTYPE html>. No explanation. No markdown.`;
}

async function createJob(jobId, answers) {
  const res = await fetch(`${SUP_URL}/rest/v1/ai4_site_builds`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUP_KEY,
      "Authorization": "Bearer " + SUP_KEY,
      "Prefer":        "return=minimal",
    },
    body: JSON.stringify({ id: jobId, status: "pending", html: null, answers }),
  });
  if (!res.ok) throw new Error("Supabase insert failed: " + await res.text());
}

async function updateJob(jobId, status, html = null) {
  await fetch(`${SUP_URL}/rest/v1/ai4_site_builds?id=eq.${jobId}`, {
    method: "PATCH",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUP_KEY,
      "Authorization": "Bearer " + SUP_KEY,
    },
    body: JSON.stringify({ status, html, updated_at: new Date().toISOString() }),
  });
}

async function generateWithClaude(answers) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         ANTH_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 4096,
      messages:   [{ role: "user", content: buildPrompt(answers) }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error("Claude error: " + (err.error?.message || res.status));
  }
  const data = await res.json();
  let html = data.content[0].text.trim();
  html = html.replace(/^```html\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
  return html;
}

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  if (req.method !== "POST")    return json({ error: "POST only" }, 405);
  if (!ANTH_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);
  if (!SUP_URL)  return json({ error: "SUPABASE_URL not set" }, 500);
  if (!SUP_KEY)  return json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, 500);

  let answers;
  try {
    const body = await req.json();
    answers = body.answers || body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const jobId = crypto.randomUUID();

  try {
    await createJob(jobId, answers);
  } catch (err) {
    console.error("[generate-bg] createJob failed:", err.message);
    return json({ error: "Could not create job: " + err.message }, 500);
  }

  // Fire and forget — Claude runs after response is sent
  (async () => {
    try {
      console.log("[generate-bg] Generating for job:", jobId);
      const html = await generateWithClaude(answers);
      await updateJob(jobId, "done", html);
      console.log("[generate-bg] Job complete:", jobId);
    } catch (err) {
      console.error("[generate-bg] Job failed:", jobId, err.message);
      await updateJob(jobId, "error", null).catch(() => {});
    }
  })();

  return json({ jobId, status: "pending" }, 202);
};

export const config = { path: "/api/generate-bg" };
