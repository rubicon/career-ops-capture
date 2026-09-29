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
const on = () => true;
const off = () => false;

describe("runCapture", () => {
  it("captures records into the buffer on a curated page", async () => {
    const raw = readFileSync("src/sites/linkedin/fixtures/top-applicant.voyager.json", "utf-8");
    const doc = new JSDOM(
      `<!doctype html><body><code id="bpr-guid-1" style="display:none">${raw.replace(/</g, "\\u003c")}</code></body>`,
    ).window.document;
    const buf = new CaptureBuffer(mem());
    const r = await runCapture(doc, CURATED, buf, find, on);
    expect(r.status).toBe("captured");
    expect(r.added).toBeGreaterThan(0);
    expect(await buf.count()).toBe(r.added);
  });
  it("reports logged-out without capturing", async () => {
    const doc = new JSDOM("<!doctype html><body></body>").window.document;
    const buf = new CaptureBuffer(mem());
    const r = await runCapture(doc, "https://www.linkedin.com/authwall", buf, find, on);
    expect(r.status).toBe("logged-out");
    expect(await buf.count()).toBe(0);
  });
  it("reports shape-error when extractor recognizes nothing", async () => {
    const doc = new JSDOM("<!doctype html><body><p>x</p></body>").window.document;
    const buf = new CaptureBuffer(mem());
    const r = await runCapture(doc, CURATED, buf, find, on);
    expect(r.status).toBe("shape-error");
  });
  it("no-module on an unrelated url", async () => {
    const doc = new JSDOM("<!doctype html><body></body>").window.document;
    const r = await runCapture(
      doc,
      "https://www.linkedin.com/feed/",
      new CaptureBuffer(mem()),
      find,
      on,
    );
    expect(r.status).toBe("no-module");
  });

  // The portals gate. It sits after the auth check on purpose: disabling a portal
  // turns off capture, not the session state the popup's re-login button reads.
  it("does not extract when the portal is disabled", async () => {
    const raw = readFileSync("src/sites/linkedin/fixtures/top-applicant.voyager.json", "utf-8");
    const doc = new JSDOM(
      `<!doctype html><body><code id="bpr-guid-1" style="display:none">${raw.replace(/</g, "\\u003c")}</code></body>`,
    ).window.document;
    const buf = new CaptureBuffer(mem());
    const r = await runCapture(doc, CURATED, buf, find, off);
    expect(r.status).toBe("portal-disabled");
    expect(r.added).toBe(0);
    expect(await buf.count()).toBe(0);
  });

  it("gates only the named portal", async () => {
    const raw = readFileSync("src/sites/linkedin/fixtures/top-applicant.voyager.json", "utf-8");
    const doc = new JSDOM(
      `<!doctype html><body><code id="bpr-guid-1" style="display:none">${raw.replace(/</g, "\\u003c")}</code></body>`,
    ).window.document;
    const r = await runCapture(
      doc,
      CURATED,
      new CaptureBuffer(mem()),
      find,
      (id) => id !== "indeed",
    );
    expect(r.status).toBe("captured");
  });

  it("still reports logged-out for a disabled portal, so the re-login prompt survives", async () => {
    const doc = new JSDOM("<!doctype html><body></body>").window.document;
    const buf = new CaptureBuffer(mem());
    const r = await runCapture(doc, "https://www.linkedin.com/authwall", buf, find, off);
    expect(r.status).toBe("logged-out");
    expect(r.authState).toBe("logged-out");
    expect(await buf.count()).toBe(0);
  });

  it("a disabled portal never reports a shape error", async () => {
    const doc = new JSDOM("<!doctype html><body><p>x</p></body>").window.document;
    const r = await runCapture(doc, CURATED, new CaptureBuffer(mem()), find, off);
    expect(r.status).toBe("portal-disabled");
  });
});
