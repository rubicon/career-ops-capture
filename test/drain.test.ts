import { describe, it, expect } from "vitest";
import { drainBuffer } from "../src/core/drain";
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
  it("clears delivered but keeps failed in a mixed batch", async () => {
    const b = new CaptureBuffer(mem());
    await b.add([rec("u1"), rec("u2")]);
    let n = 0;
    const flaky = async () => {
      n++;
      if (n === 1) return { ok: true, json: async () => ({}) } as any;
      throw new Error("down");
    };
    const r = await drainBuffer(b, cfg, flaky as any);
    expect(r.delivered).toBe(1);
    expect(r.failed).toBe(1);
    expect(await b.count()).toBe(1);
    expect((await b.list())[0]?.url).toBe("u2");
  });
});
