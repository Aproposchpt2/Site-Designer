// netlify/functions/generate.mjs
// Freestyle HTML generator — Claude writes the complete HTML, no templates, no schema.
// Every run produces a genuinely different site with its own layout, palette, and copy.

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
    a.name  ? `Business: ${a.name}`          : null,
    a.what  ? `What they do: ${a.what}`       : null,
    a.who   ? `Ideal customers: ${a.who}`     : null,
    a.diff  ? `Differentiator: ${a.diff}`     : null,
    a.else  ? `Additional context: ${a.else}` : null,
    a.site  ? `Website: ${a.site}`            : null,
    a.email ? `Email: ${a.email}`             : null,
    a.addr  ? `Address: ${a.addr}`            : null,
  ].filter(Boolean).join('\n');

  let prompt;

  if (mode === "design" && existingContent) {
    prompt = `You are an elite web designer. Rebuild this business website with a COMPLETELY DIFFERENT visual design.

REUSE THIS CONTENT EXACTLY (same brand name, same copy, same information):
Brand: ${existingContent.brand || a.name || ""}
${existingContent.context || ctx}

DESIGN RULES — make it dramatically different from the previous version:
- Completely different color palette and mood (dark vs light, warm vs cool, minimal vs bold)
- Different layout structure (asymmetric grid, full-bleed sections, split screens, overlapping layers)
- Different typography personality (editorial serif vs geometric sans vs expressive display)
- Different section order and visual hierarchy
- Pretend a different designer with a different aesthetic philosophy built this

Technical requirements:
- Complete standalone HTML — all CSS in <style> in <head>
- Load 1-2 Google Fonts via <link> in <head>
- Fully mobile responsive with CSS media queries
- Sections: hero, services/offerings, differentiator/about, contact form, footer
- Contact form with data-netlify="true" and name/email/phone/message fields
- No external JavaScript libraries
- CSS custom properties for color system

Return ONLY the HTML starting with <!DOCTYPE html>. No markdown. No explanation.`;
  } else {
    prompt = `You are an elite web designer and copywriter. Build a complete, launch-ready business website.

BUSINESS DETAILS:
${ctx || "A premium business that delivers exceptional value to its customers."}

YOUR MANDATE — create without constraints:
- Write all copy from scratch: headlines, taglines, service descriptions, CTAs, footer
- Invent a visual identity that feels specifically right for this business
- BREAK OUT of generic templates — no cookie-cutter hero/features/CTA patterns
- Try unexpected approaches: magazine layouts, editorial grids, bold asymmetry, cinematic heroes
- Choose colors, fonts, and spacing that create a distinct mood and personality
- Every generation must look completely different from every other — vary everything

Inspire yourself: luxury editorial, brutalist tech, warm artisan, dark cinematic, clean minimal, bold expressive — pick a direction that fits the business and commit to it fully.

Technical requirements:
- Complete standalone HTML — all CSS in <style> in <head>
- Load 1-2 Google Fonts via <link> in <head>
- Fully mobile responsive with CSS media queries
- Include: hero section, services/offerings section, why-choose-us/differentiator section, contact form section, footer
- Contact form: data-netlify="true", fields for name/email/phone/message, submit button
- No external JavaScript libraries
- CSS custom properties (--color-bg, --color-text, --color-accent, etc.) for the color system
- Production quality: not a mockup, not a wireframe

Return ONLY the HTML starting with <!DOCTYPE html>. No markdown code fences. No explanation.`;
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

    // Strip markdown code blocks if Claude wrapped the output
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
