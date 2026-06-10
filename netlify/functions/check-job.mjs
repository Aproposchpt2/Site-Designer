// netlify/functions/check-job.mjs
// Polling endpoint — browser calls this every 3 seconds to check job status
// GET /api/check-job?id=<jobId>

import { getStore } from "@netlify/blobs";

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

  if (!jobId) return json({ error: "Missing id parameter" }, 400);

  try {
    const store = getStore("ai4-jobs");
    const job   = await store.get(jobId, { type: "json" });

    if (!job) return json({ status: "not_found" }, 404);

    return json({
      status: job.status,
      html:   job.status === "done" ? job.html : null,
      error:  job.error || null,
    });
  } catch (err) {
    console.error("[check-job] Error:", err.message);
    return json({ error: err.message }, 500);
  }
};

export const config = { path: "/api/check-job" };
