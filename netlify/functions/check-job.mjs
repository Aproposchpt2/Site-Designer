// netlify/functions/check-job.mjs
// Reads job status from /tmp — same instance as generate-bg

import { readFileSync, existsSync } from "fs";

const HEADERS = {
  "Content-Type":                "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":"Content-Type",
  "Access-Control-Allow-Methods":"GET, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);

  const url   = new URL(req.url);
  const jobId = url.searchParams.get("id");
  if (!jobId) return json({ error: "Missing id" }, 400);

  // Sanitize jobId — UUID only
  if (!/^[0-9a-f-]{36}$/.test(jobId)) return json({ error: "Invalid id" }, 400);

  const path = `/tmp/ai4_${jobId}.json`;
  if (!existsSync(path)) return json({ status: "pending" });

  try {
    const job = JSON.parse(readFileSync(path, "utf8"));
    return json({ status: job.status, html: job.html || null, error: job.error || null });
  } catch {
    return json({ status: "pending" });
  }
};

export const config = { path: "/api/check-job" };
