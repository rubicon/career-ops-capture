import { describe, it, expect } from "vitest";
import { deliver } from "../src/core/delivery";
import type { CapturedRecord } from "../src/core/types";

const rec: CapturedRecord = {
  url: "https://www.linkedin.com/jobs/view/123/",
  company: "Acme",
  role: "VP Marketing",
  location: "Remote",
  signals: { topApplicant: true, matchPercent: 92 },
  source: "LinkedIn -- Top Applicant",
  capturedAt: "t",
};
const cfg = { host: "127.0.0.1", port: 3000, token: "tok" };

describe("deliver", () => {
  it("posts {url,company,title,location,source} (+ forward-compat note/sig) to /api/explore/add", async () => {
    let seen: any;
    const fakeFetch = async (url: string, init: any) => {
      seen = { url, init, body: JSON.parse(init.body) };
      return { ok: true, json: async () => ({ added: 1 }) } as any;
    };
    const r = await deliver(rec, cfg, fakeFetch as any);
    expect(r.ok).toBe(true);
    expect(seen.url).toBe("http://127.0.0.1:3000/api/explore/add");
    expect(seen.body.title).toBe("VP Marketing"); // field is `title`, not `role`
    expect(seen.body.role).toBeUndefined();
    expect(seen.body.source).toBe("LinkedIn -- Top Applicant");
    // Forward-compatible: sent now, preserved once the writer enhancement lands.
    expect(seen.body.note).toBe("Top Applicant, 92% match");
    expect(seen.body.sig).toContain("prio=A");
  });

  it("treats any 2xx as ok (safe to clear from buffer)", async () => {
    const fakeFetch = async () =>
      ({ ok: true, json: async () => ({ added: 0, skipped: 1 }) }) as any;
    expect((await deliver(rec, cfg, fakeFetch as any)).ok).toBe(true);
  });

  it("non-2xx → not ok (kept for retry)", async () => {
    const fakeFetch = async () => ({ ok: false, status: 500, json: async () => ({}) }) as any;
    expect((await deliver(rec, cfg, fakeFetch as any)).ok).toBe(false);
  });

  it("network error → not ok", async () => {
    const fakeFetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const r = await deliver(rec, cfg, fakeFetch as any);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("ECONNREFUSED");
  });
});
