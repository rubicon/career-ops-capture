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
// Verify against your running career-ops app before relying on end-to-end delivery:
//   1. auth model. Keep the X-Career-Ops-Token header if the endpoint requires
//      one; drop it if not. The `token` config field is retained for that.
//   2. response shape. The API may dedup internally and report added/skipped counts
//      rather than {captured, duplicate}. Any 2xx is treated as delivered (safe to
//      clear from the buffer); `duplicate` is only set if the API exposes it.
//   3. CORS/Origin for chrome-extension:// requests.
export async function deliver(
  rec: CapturedRecord,
  cfg: DeliveryConfig,
  fetchImpl: FetchImpl,
): Promise<{ ok: boolean; duplicate: boolean; error?: string }> {
  // The API field is `title`, not `role`. note/sig are forward-compatible extras,
  // ignored by the canonical writer until the signal-preservation enhancement lands.
  const body = {
    url: rec.url,
    company: rec.company,
    title: rec.role,
    location: rec.location ?? "",
    source: rec.source,
    note: deriveNote(rec.signals),
    sig: deriveSig(rec.signals, sigSource(rec.source)),
  };
  try {
    const res = await fetchImpl(`http://${cfg.host}:${cfg.port}/api/explore/add`, {
      method: "POST",
      // Verify auth: keep this header if /api/explore/add requires one; else drop it.
      headers: { "Content-Type": "application/json", "X-Career-Ops-Token": cfg.token },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, duplicate: false, error: `HTTP ${res.status ?? "error"}` };
    const j = await res.json().catch(() => ({}));
    return { ok: true, duplicate: j?.duplicate === true };
  } catch (e) {
    return { ok: false, duplicate: false, error: (e as Error).message };
  }
}

// The machine-tag source token is a slug; the human `source` may be a label.
function sigSource(source: string): string {
  return source.toLowerCase().includes("top applicant") ? "linkedin-topapplicant" : "linkedin";
}
