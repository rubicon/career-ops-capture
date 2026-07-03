import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { extractEmbedded } from "../src/sites/linkedin/extract-embedded";

// Fixture key paths (SYNTHETIC placeholder, reconcile with a real capture before release):
//   job id/entityUrn : included[].entityUrn  (urn:li:fsd_jobPostingCard:<digits>)
//   title            : included[].title
//   company          : included[].primarySubtitle.text | included[].companyName
//   location         : included[].secondarySubtitle.text | included[].formattedLocation
//   Top-Applicant/%  : included[].relevanceInsight.text.text | jobInsights[].text | footerItems[].text

function docWithEmbedded(json: string): Document {
  // LinkedIn hydrates from hidden <code> blocks; replicate that shape.
  const html = `<!doctype html><body><code id="bpr-guid-1" style="display:none">${json.replace(/</g, "\\u003c")}</code></body>`;
  return new JSDOM(html).window.document;
}

const CURATED = "https://www.linkedin.com/jobs/collections/top-applicant/";

describe("extractEmbedded", () => {
  const raw = readFileSync("src/sites/linkedin/fixtures/top-applicant.voyager.json", "utf-8");

  it("recognizes the embedded model shape", () => {
    const { recognized } = extractEmbedded(docWithEmbedded(raw), CURATED);
    expect(recognized).toBe(true);
  });

  it("extracts records with linkedin job-view urls, non-empty company and role", () => {
    const { records } = extractEmbedded(docWithEmbedded(raw), CURATED);
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(r.url).toMatch(/^https:\/\/www\.linkedin\.com\/jobs\/view\/\d+/);
      expect(r.company).not.toBe("");
      expect(r.role).not.toBe("");
    }
  });

  it("captures the Top Applicant signal when present in the fixture", () => {
    const { records } = extractEmbedded(docWithEmbedded(raw), CURATED);
    expect(records.some((r) => r.signals.topApplicant === true)).toBe(true);
  });

  it("captures match percent from insight text", () => {
    const { records } = extractEmbedded(docWithEmbedded(raw), CURATED);
    expect(records.some((r) => r.signals.matchPercent === 92)).toBe(true);
  });

  it("ignores non-job entities (Company) in included[]", () => {
    const { records } = extractEmbedded(docWithEmbedded(raw), CURATED);
    // fixture has 3 job cards + 1 company entity → exactly 3 records
    expect(records.length).toBe(3);
  });

  it("returns recognized=false for an unrelated document", () => {
    const doc = new JSDOM("<!doctype html><body><p>hello</p></body>").window.document;
    expect(extractEmbedded(doc, "https://www.linkedin.com/feed/").recognized).toBe(false);
  });
});
