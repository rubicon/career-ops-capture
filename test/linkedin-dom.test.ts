import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { extractDom } from "../src/sites/linkedin/extract-dom";

function doc(): Document {
  const body = readFileSync("src/sites/linkedin/fixtures/cards.html", "utf-8");
  return new JSDOM(`<!doctype html><body>${body}</body>`).window.document;
}

const CURATED = "https://www.linkedin.com/jobs/collections/top-applicant/";

describe("extractDom", () => {
  it("recognizes card containers", () => {
    expect(extractDom(doc(), CURATED).recognized).toBe(true);
  });

  it("extracts records with job-view urls", () => {
    const { records } = extractDom(doc(), CURATED);
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(r.url).toMatch(/\/jobs\/view\/\d+/);
      expect(r.company).not.toBe("");
      expect(r.role).not.toBe("");
    }
  });

  it("parses the Top Applicant / match signal from card insight text", () => {
    const { records } = extractDom(doc(), CURATED);
    const vp = records.find((r) => r.role.includes("Vice President"));
    expect(vp?.signals.topApplicant).toBe(true);
    expect(vp?.signals.matchPercent).toBe(92);
  });

  it("recognized=false when no cards", () => {
    const empty = new JSDOM("<!doctype html><body><p>x</p></body>").window.document;
    expect(extractDom(empty, CURATED).recognized).toBe(false);
  });
});
