import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { linkedInModule, ExtractorShapeError } from "../src/sites/linkedin/index";

const CURATED = "https://www.linkedin.com/jobs/collections/top-applicant/";

describe("linkedInModule", () => {
  it("matches curated surfaces, not the feed", () => {
    expect(linkedInModule.matches(CURATED)).toBe(true);
    expect(linkedInModule.matches("https://www.linkedin.com/jobs/collections/recommended/")).toBe(
      true,
    );
    expect(linkedInModule.matches("https://www.linkedin.com/feed/")).toBe(false);
  });

  it("throws ExtractorShapeError when neither tier recognizes the page", () => {
    const doc = new JSDOM("<!doctype html><body><p>nothing</p></body>").window.document;
    expect(() => linkedInModule.extract({ doc, url: CURATED })).toThrow(ExtractorShapeError);
  });

  it("detects logged-out via authwall url", () => {
    const doc = new JSDOM("<!doctype html><body></body>").window.document;
    expect(
      linkedInModule.detectAuthState({ doc, url: "https://www.linkedin.com/authwall?x=1" }),
    ).toBe("logged-out");
  });

  it("detects authed when member chrome present", () => {
    const doc = new JSDOM('<!doctype html><body><div class="global-nav__me"></div></body>').window
      .document;
    expect(linkedInModule.detectAuthState({ doc, url: CURATED })).toBe("authed");
  });

  it("extracts from a real embedded fixture", () => {
    const raw = readFileSync("src/sites/linkedin/fixtures/top-applicant.voyager.json", "utf-8");
    const html = `<!doctype html><body><code id="bpr-guid-1" style="display:none">${raw.replace(/</g, "\\u003c")}</code></body>`;
    const doc = new JSDOM(html).window.document;
    const records = linkedInModule.extract({ doc, url: CURATED });
    expect(records.length).toBeGreaterThan(0);
  });

  it("falls back to tier-2 DOM when tier-1 finds no embedded models", () => {
    const body = readFileSync("src/sites/linkedin/fixtures/cards.html", "utf-8");
    const doc = new JSDOM(`<!doctype html><body>${body}</body>`).window.document;
    const records = linkedInModule.extract({ doc, url: CURATED });
    expect(records.length).toBeGreaterThan(0);
  });
});
