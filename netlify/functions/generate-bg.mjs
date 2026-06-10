// netlify/functions/generate-bg.mjs
// Uses /tmp for job storage — available in all Netlify functions, no dependencies

import { writeFileSync, readFileSync, existsSync } from "fs";

const MODEL    = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const ANTH_KEY = process.env.ANTHROPIC_API_KEY;

const HEADERS = {
  "Content-Type":                "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":"Content-Type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

function jobPath(id) {
  return `/tmp/ai4_${id}.json`;
}

function writeJob(id, data) {
  writeFileSync(jobPath(id), JSON.stringify(data));
}

function readJob(id) {
  const p = jobPath(id);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
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
1. INVENT a completely unique visual identity — colors, fonts, layout — built specifically for this business and industry. Never use generic blue-white tech look for non-tech businesses.
2. WRITE real compelling copy specific to this business. Zero placeholder text. Zero generic phrases.
3. DESIGN for their industry — a barbershop must look nothing like a law firm.
4. Include ALL contact details as clickable links in the contact section.
5. Mobile responsive with media queries.
6. Contact form: <form name="contact" method="POST" data-netlify="true"><input type="hidden" name="form-name" value="contact">
7. Footer: © ${year} ${a.name || "Your Business"}. All rights reserved.

SECTIONS: Navigation + Hero + Services + Why Choose Them + Contact + Footer

Return ONLY the complete HTML. Start with <!DOCTYPE html>. No explanation. No markdown.`;
}

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  if (req.method !== "POST")    return json({ error: "POST only" }, 405);
  if (!ANTH_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  let answers;
  try {
    const body = await req.json();
    answers = body.answers || body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const jobId = crypto.randomUUID();

  // Write pending state to /tmp
  writeJob(jobId, { status: "pending", html: null });

  // Fire Claude in background
  (async () => {
    try {
      console.log("[generate-bg] Starting job:", jobId, "for:", answers.name);
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
        throw new Error(err.error?.message || "Claude API error " + res.status);
      }

      const data = await res.json();
      let html = data.content[0].text.trim();
      html = html.replace(/^```html\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();

      writeJob(jobId, { status: "done", html });
      console.log("[generate-bg] Job complete:", jobId);
    } catch (err) {
      console.error("[generate-bg] Job failed:", err.message);
      writeJob(jobId, { status: "error", html: null, error: err.message });
    }
  })();

  return json({ jobId, status: "pending" }, 202);
};

export const config = { path: "/api/generate-bg" };
