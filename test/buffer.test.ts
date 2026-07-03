import { describe, it, expect } from "vitest";
import { CaptureBuffer } from "../src/core/buffer";
import type { CapturedRecord } from "../src/core/types";

function memStorage() {
  const mem: Record<string, unknown> = {};
  return {
    async get(key: string) {
      return { [key]: mem[key] };
    },
    async set(obj: Record<string, unknown>) {
      Object.assign(mem, obj);
    },
  };
}
const rec = (url: string): CapturedRecord => ({
  url,
  company: "C",
  role: "R",
  signals: {},
  source: "s",
  capturedAt: "t",
});

describe("CaptureBuffer", () => {
  it("adds and lists", async () => {
    const b = new CaptureBuffer(memStorage());
    expect(await b.add([rec("u1"), rec("u2")])).toBe(2);
    expect(await b.count()).toBe(2);
  });
  it("dedups by url on add", async () => {
    const b = new CaptureBuffer(memStorage());
    await b.add([rec("u1")]);
    expect(await b.add([rec("u1"), rec("u2")])).toBe(1);
    expect(await b.count()).toBe(2);
  });
  it("removes acked urls", async () => {
    const b = new CaptureBuffer(memStorage());
    await b.add([rec("u1"), rec("u2")]);
    await b.remove(["u1"]);
    expect((await b.list()).map((r) => r.url)).toEqual(["u2"]);
  });
  it("count is 0 on a fresh buffer", async () => {
    expect(await new CaptureBuffer(memStorage()).count()).toBe(0);
  });
});
