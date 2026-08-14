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

  it("drops no card from the healthy fixture", () => {
    const r = extractDom(doc(), CURATED);
    expect(r.cardCount).toBe(3);
    expect(r.droppedCount).toBe(0);
  });

  it("reports cards found and every card dropped when the field selectors churn", () => {
    const churned = new JSDOM(
      '<!doctype html><body><ul><li class="scaffold-layout__list-item" data-job-id="3901234567">' +
        '<div class="job-card-container"></div></li></ul></body>',
    ).window.document;
    const r = extractDom(churned, CURATED);
    expect(r.recognized).toBe(true);
    expect(r.cardCount).toBe(1);
    expect(r.droppedCount).toBe(1);
    expect(r.records).toEqual([]);
  });
});
