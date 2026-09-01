import type { CapturedRecord } from "./types";
import { deriveNote, deriveSig } from "./signals";

export interface DeliveryConfig {
  host: string;
  port: number;
  token: string;
}

export type FetchImpl = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status?: number; json: () => Promise<any> }>;

// POST one record to the career-ops API endpoint /api/explore/add.
//
// The endpoint reads `body.offers`, an array, and ignores everything else. A flat
// record makes it read undefined, write nothing, and still answer 200, which is how
// a day of captures was acked and dropped from the buffer having reached no one.
// One record per request, rather than the whole buffer in one envelope: the route
// answers with a count and no identities, so a batch could only be acked all or
// nothing, and one malformed record would hold every other record hostage.
//
// The writer behind the route (addOffersToPipeline) reads exactly url, company,
// title, location, source and note off each offer and discards the rest. It requires
// url to match ^https?://. It does not dedup and never reports a duplicate.
//
// The route has no auth check and the app has no middleware, so the token header is
// sent only when one is actually configured.
export async function deliver(
  rec: CapturedRecord,
  cfg: DeliveryConfig,
  fetchImpl: FetchImpl,
): Promise<{ ok: boolean; duplicate: boolean; error?: string }> {
  // The API field is `title`, not `role`. note/sig are forward-compatible extras,
  // ignored by the canonical writer until the signal-preservation enhancement lands.
  const offer = {
    url: rec.url,
    company: rec.company,
    title: rec.role,
    location: rec.location ?? "",
    source: rec.source,
    note: deriveNote(rec.signals),
    sig: deriveSig(rec.signals, sigSource(rec.source)),
  };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.token) headers["X-Career-Ops-Token"] = cfg.token;
  try {
    const res = await fetchImpl(`http://${cfg.host}:${cfg.port}/api/explore/add`, {
      method: "POST",
      headers,
      body: JSON.stringify({ offers: [offer] }),
    });
    if (!res.ok) return { ok: false, duplicate: false, error: `HTTP ${res.status ?? "error"}` };
    const j = await res.json().catch(() => ({}));
    // `added` is the app's own count of what it wrote. Since it never dedups, a
    // non-positive or absent count means this record was not written, whatever the
    // status code said, and the buffer must keep it rather than ack a phantom write.
    const added = typeof j?.added === "number" ? j.added : 0;
    if (added < 1) {
      return {
        ok: false,
        duplicate: false,
        error: j?.error ? String(j.error) : "app accepted the request but wrote no record",
      };
    }
    return { ok: true, duplicate: j?.duplicate === true };
  } catch (e) {
    return { ok: false, duplicate: false, error: (e as Error).message };
  }
}

// The machine-tag source token must be a single slug: `sig` is space-delimited
// `k=v`, so a source carrying spaces would corrupt it. Extractor slugs such as
// `linkedin-topapplicant` pass through unchanged; a human label is slugged rather
// than reclassified, so no record ever claims a surface it did not come from.
function sigSource(source: string): string {
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
