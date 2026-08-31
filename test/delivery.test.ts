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
  it("posts an {offers:[...]} envelope, the shape /api/explore/add reads", async () => {
    let seen: any;
    const fakeFetch = async (url: string, init: any) => {
      seen = { url, init, body: JSON.parse(init.body) };
      return { ok: true, json: async () => ({ added: 1 }) } as any;
    };
    const r = await deliver(rec, cfg, fakeFetch as any);
    expect(r.ok).toBe(true);
    expect(seen.url).toBe("http://127.0.0.1:3000/api/explore/add");
    // The route reads body.offers and ignores everything else. A flat record makes
    // it read undefined, write nothing, and still answer 200.
    expect(Array.isArray(seen.body.offers)).toBe(true);
    expect(seen.body.offers).toHaveLength(1);
    const offer = seen.body.offers[0];
    expect(offer.title).toBe("VP Marketing"); // the API field is `title`, not `role`
    expect(offer.role).toBeUndefined();
    expect(offer.url).toBe("https://www.linkedin.com/jobs/view/123/");
    expect(offer.company).toBe("Acme");
    expect(offer.location).toBe("Remote");
    expect(offer.source).toBe("LinkedIn -- Top Applicant");
    // Forward-compatible: sent now, preserved once the writer enhancement lands.
    expect(offer.note).toBe("Top Applicant, 92% match");
    expect(offer.sig).toContain("prio=A");
  });

  // The receiver answers 200 {added:0} for a body it could not read, and never
  // reports duplicates, so added:0 always means nothing was written. Calling that
  // delivered is what let drainBuffer clear records the app never received.
  it("2xx with added:0 is a failure, not a delivery", async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ added: 0 }) }) as any;
    const r = await deliver(rec, cfg, fakeFetch as any);
    expect(r.ok).toBe(false);
  });

  it("2xx with no added field at all is a failure", async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({}) }) as any;
    expect((await deliver(rec, cfg, fakeFetch as any)).ok).toBe(false);
  });

  it("surfaces the route's own error string", async () => {
    const fakeFetch = async () =>
      ({ ok: true, json: async () => ({ added: 0, error: "checkout is data-only" }) }) as any;
    const r = await deliver(rec, cfg, fakeFetch as any);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("data-only");
  });

  it("sends the token header only when a token is configured", async () => {
    let headers: any;
    const fakeFetch = async (_u: string, init: any) => {
      headers = init.headers;
      return { ok: true, json: async () => ({ added: 1 }) } as any;
    };
    await deliver(rec, cfg, fakeFetch as any);
    expect(headers["X-Career-Ops-Token"]).toBe("tok");
    await deliver(rec, { ...cfg, token: "" }, fakeFetch as any);
    expect(headers["X-Career-Ops-Token"]).toBeUndefined();
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
