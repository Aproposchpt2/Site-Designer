// netlify/functions/generate.mjs
// Agency Dossier Engine — Claude acts as Creative Director building a client's digital flagship.
// Every site is a strategic, bespoke dossier — not a template, not a website.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "Server missing ANTHROPIC_API_KEY env var" }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const a = body.answers || {};
  const mode = body.mode || "full";
  const existingContent = body.existingContent || null;

  const ctx = [
    a.name      ? `Client Name: ${a.name}`              : null,
    a.what      ? `What They Do: ${a.what}`              : null,
    a.who       ? `Their Ideal Client: ${a.who}`         : null,
    a.diff      ? `Why They Win: ${a.diff}`              : null,
    a.else      ? `Additional Intelligence: ${a.else}`   : null,
    a.phone     ? `Business Phone: ${a.phone}`           : null,
    a.email     ? `Business Email: ${a.email}`           : null,
    a.addr      ? `Business Address: ${a.addr}`          : null,
    a.facebook  ? `Facebook: ${a.facebook}`              : null,
    a.instagram ? `Instagram: ${a.instagram}`            : null,
    a.tiktok    ? `TikTok: ${a.tiktok}`                  : null,
    a.linkedin  ? `LinkedIn: ${a.linkedin}`              : null,
  ].filter(Boolean).join('\n');

  const AGENCY_STANDARDS = `
AGENCY STANDARDS — non-negotiable:
- The headline must make this client's competitors uncomfortable. It should state their market position with total confidence.
- Copy must be written for THEIR ideal client, not for everyone. Speak directly to the person who needs them most.
- Visual design must look like it belongs in a Behance award showcase — deliberate, considered, premium.
- Typography carries authority. Choose fonts that make a statement. Pair display and body with intention.
- Color is strategy. Every palette choice must serve the client's positioning (luxury, trust, energy, authority, warmth — pick one and commit).
- White space is not empty — it is presence. Premium brands breathe.
- Every section must earn its place by moving the visitor one step closer to taking action.
- The contact section is the close. Make it feel like an invitation, not a form.

ABSOLUTELY FORBIDDEN:
- "Welcome to [Business Name]" — banned forever
- "We are dedicated to..." — amateur
- "Your trusted partner" — meaningless
- "We provide quality services" — fire the copywriter
- "Years of experience" without specifics — empty
- Icon grid + headline + short paragraph — generic template
- Predictable blue/white/grey — safe is invisible
- Hero with stock-photo placeholder — incomplete
- Any phrase another business could copy-paste by swapping the name

TECHNICAL REQUIREMENTS:
- Complete standalone HTML — all CSS in <style> in <head>
- Load 1-2 Google Fonts via <link> in <head>
- Fully mobile responsive with CSS Grid and Flexbox + media queries
- CSS custom properties for the full design system (colors, fonts, spacing)
- Sections: hero, proof/credentials, services, differentiator, contact form, footer
- Contact form: data-netlify="true", fields for name/email/phone/message/submit
- Display ALL contact details provided: phone, email, address, and any social media links (Facebook, Instagram, TikTok, LinkedIn) must appear in the contact section
- Social media links must be clickable <a href="..."> links, not plain text
- No external JavaScript libraries
- Production quality — this goes live as-is`;

  let prompt;

  if (mode === "design" && existingContent) {
    prompt = `You are the Creative Director at AI4 Businesses, a premium digital agency.

A client account has just changed hands within the agency. The previous team delivered a strong dossier. Your team has been challenged to produce a completely different creative interpretation — same client intelligence, entirely different strategic vision.

CLIENT INTELLIGENCE (preserve this content exactly):
Client: ${existingContent.brand || a.name || ""}
${existingContent.context || ctx}

YOUR CREATIVE CHALLENGE:
Produce a version that makes the previous version feel like a different era entirely.
- Opposite mood (if it was dark, go luminous; if minimal, go rich and layered)
- Different structural logic (if it was centered narrative, try editorial split; if it was bold asymmetry, try refined symmetry)
- Different typographic personality (if it used sharp sans-serif authority, try warm humanist or editorial serif)
- Different emotional register (if it was bold and aggressive, try confident and understated)
- The client's facts are the raw material. Your vision is the transformation.
${AGENCY_STANDARDS}

Return ONLY the complete HTML starting with <!DOCTYPE html>. No markdown. No explanation.`;

  } else {
    prompt = `You are the Creative Director at AI4 Businesses, a premium digital agency.

You have just received a new client brief. Your deliverable is their DIGITAL DOSSIER — a flagship web presence that establishes this client as the definitive authority in their market.

This is not a website build. This is a strategic document executed in HTML.
The dossier has three jobs:
1. POSITION — the hero section must stake their claim before the visitor can look away
2. PROVE — the body must build undeniable credibility and desire
3. CONVERT — the close must make reaching out feel like the obvious next step

CLIENT BRIEF:
${ctx || "A premium business ready to establish market authority."}

YOUR CREATIVE MANDATE:
- Write all copy from scratch — transform the brief into authoritative, compelling language
- Invent a visual identity that feels made for this specific client and no other
- Choose an unexpected creative direction: think award-winning agency portfolios, not business templates
- Every design decision (color, type, layout, spacing) must serve their market positioning
- Make competitors uncomfortable. Make prospects lean forward.
- Each generation must be distinctly different — no two dossiers should look alike
${AGENCY_STANDARDS}

Return ONLY the complete HTML starting with <!DOCTYPE html>. No markdown code fences. No explanation. Begin with <!DOCTYPE html>.`;
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return json({ error: "anthropic " + r.status, detail: t.slice(0, 400) }, 502);
    }

    const data = await r.json();
    const rawText = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const html = rawText
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    return json({
      html,
      content: { brand: a.name || "Your Business", context: ctx }
    }, 200);

  } catch (err) {
    return json({ error: "generation failed", detail: String(err).slice(0, 300) }, 500);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
