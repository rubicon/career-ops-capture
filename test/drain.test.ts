import { describe, it, expect } from "vitest";
import { drainBuffer, describeDrain } from "../src/core/drain";
import { CaptureBuffer } from "../src/core/buffer";
import type { CapturedRecord } from "../src/core/types";

function mem() {
  const m: Record<string, unknown> = {};
  return {
    async get(k: string) {
      return { [k]: m[k] };
    },
    async set(o: Record<string, unknown>) {
      Object.assign(m, o);
    },
  };
}
const rec = (u: string): CapturedRecord => ({
  url: u,
  company: "C",
  role: "R",
  signals: {},
  source: "s",
  capturedAt: "t",
});
const cfg = { host: "127.0.0.1", port: 3000, token: "T" };

describe("drainBuffer", () => {
  it("delivers all and empties buffer on success", async () => {
    const b = new CaptureBuffer(mem());
    await b.add([rec("u1"), rec("u2")]);
    const ok = async () => ({ ok: true, json: async () => ({ added: 1 }) }) as any;
    const r = await drainBuffer(b, cfg, ok as any);
    expect(r.delivered).toBe(2);
    expect(await b.count()).toBe(0);
  });
  it("keeps failed records for retry", async () => {
    const b = new CaptureBuffer(mem());
    await b.add([rec("u1")]);
    const fail = async () => {
      throw new Error("down");
    };
    const r = await drainBuffer(b, cfg, fail as any);
    expect(r.failed).toBe(1);
    expect(await b.count()).toBe(1);
  });
  // The regression that lost a day of captures: the receiver answers 200 {added:0}
  // for a body it could not read, the drain called that delivered, and the records
  // were removed from the buffer having been written nowhere.
  it("keeps records the app answered 200 for but did not write", async () => {
    const b = new CaptureBuffer(mem());
    await b.add([rec("u1"), rec("u2")]);
    const wroteNothing = async () => ({ ok: true, json: async () => ({ added: 0 }) }) as any;
    const r = await drainBuffer(b, cfg, wroteNothing as any);
    expect(r.delivered).toBe(0);
    expect(r.failed).toBe(2);
    expect(await b.count()).toBe(2);
  });

  it("carries the first failure's reason out for the popup", async () => {
    const b = new CaptureBuffer(mem());
    await b.add([rec("u1")]);
    const wroteNothing = async () =>
      ({ ok: true, json: async () => ({ added: 0, error: "checkout is data-only" }) }) as any;
    expect((await drainBuffer(b, cfg, wroteNothing as any)).error).toContain("data-only");
  });

  it("clears delivered but keeps failed in a mixed batch", async () => {
    const b = new CaptureBuffer(mem());
    await b.add([rec("u1"), rec("u2")]);
    let n = 0;
    const flaky = async () => {
      n++;
      if (n === 1) return { ok: true, json: async () => ({ added: 1 }) } as any;
      throw new Error("down");
    };
    const r = await drainBuffer(b, cfg, flaky as any);
    expect(r.delivered).toBe(1);
    expect(r.failed).toBe(1);
    expect(await b.count()).toBe(1);
    expect((await b.list())[0]?.url).toBe("u2");
  });
});

describe("describeDrain", () => {
  it("reports a clean send", () =>
    expect(describeDrain({ delivered: 3, duplicate: 0, failed: 0 })).toBe("sent 3"));
  it("reports an empty buffer", () =>
    expect(describeDrain({ delivered: 0, duplicate: 0, failed: 0 })).toBe("nothing to send"));
  it("never says sent when nothing was written", () =>
    expect(describeDrain({ delivered: 0, duplicate: 0, failed: 2, error: "wrote no record" })).toBe(
      "none sent, 2 kept for retry: wrote no record",
    ));
  it("reports a partial send", () =>
    expect(describeDrain({ delivered: 1, duplicate: 0, failed: 1, error: "down" })).toBe(
      "sent 1, 1 kept for retry: down",
    ));
  it("reports a background that never answered", () =>
    expect(describeDrain(null)).toBe("could not reach the extension background"));
});
