import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { runCapture } from "../src/core/capture-run";
import { CaptureBuffer } from "../src/core/buffer";
import { linkedInModule } from "../src/sites/linkedin/index";

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
const find = (url: string) => (linkedInModule.matches(url) ? linkedInModule : undefined);
const CURATED = "https://www.linkedin.com/jobs/collections/top-applicant/";

describe("runCapture", () => {
  it("captures records into the buffer on a curated page", async () => {
    const raw = readFileSync("src/sites/linkedin/fixtures/top-applicant.voyager.json", "utf-8");
    const doc = new JSDOM(
      `<!doctype html><body><code id="bpr-guid-1" style="display:none">${raw.replace(/</g, "\\u003c")}</code></body>`,
    ).window.document;
    const buf = new CaptureBuffer(mem());
    const r = await runCapture(doc, CURATED, buf, find);
    expect(r.status).toBe("captured");
    expect(r.added).toBeGreaterThan(0);
    expect(await buf.count()).toBe(r.added);
  });
  it("reports logged-out without capturing", async () => {
    const doc = new JSDOM("<!doctype html><body></body>").window.document;
    const buf = new CaptureBuffer(mem());
    const r = await runCapture(doc, "https://www.linkedin.com/authwall", buf, find);
    expect(r.status).toBe("logged-out");
    expect(await buf.count()).toBe(0);
  });
  it("reports shape-error when extractor recognizes nothing", async () => {
    const doc = new JSDOM("<!doctype html><body><p>x</p></body>").window.document;
    const buf = new CaptureBuffer(mem());
    const r = await runCapture(doc, CURATED, buf, find);
    expect(r.status).toBe("shape-error");
  });
  it("no-module on an unrelated url", async () => {
    const doc = new JSDOM("<!doctype html><body></body>").window.document;
    const r = await runCapture(
      doc,
      "https://www.linkedin.com/feed/",
      new CaptureBuffer(mem()),
      find,
    );
    expect(r.status).toBe("no-module");
  });
});
