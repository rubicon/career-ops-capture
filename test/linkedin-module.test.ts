import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { linkedInModule, ExtractorShapeError } from "../src/sites/linkedin/index";

const CURATED = "https://www.linkedin.com/jobs/collections/top-applicant/";

function fixture(name: string): string {
  return readFileSync(`src/sites/linkedin/fixtures/${name}`, "utf-8");
}

// LinkedIn hydrates from hidden <code> blocks; `extraBody` is the rendered markup
// the tier-2 DOM parser would see alongside them.
function docWith(payload: string, extraBody = ""): Document {
  const html = `<!doctype html><body><code id="bpr-guid-1" style="display:none">${payload.replace(/</g, "\\u003c")}</code>${extraBody}</body>`;
  return new JSDOM(html).window.document;
}

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

  it("falls back to tier-2 DOM when tier-1 finds job cards but extracts none", () => {
    const doc = docWith(fixture("churned-title.voyager.json"), fixture("cards.html"));
    const records = linkedInModule.extract({ doc, url: CURATED });
    expect(records.length).toBe(3);
  });

  it("throws ExtractorShapeError when tier-1 finds job cards and no tier extracts any", () => {
    const doc = docWith(fixture("churned-title.voyager.json"));
    expect(() => linkedInModule.extract({ doc, url: CURATED })).toThrow(ExtractorShapeError);
    expect(() => linkedInModule.extract({ doc, url: CURATED })).toThrow(/2 job cards/);
  });

  it("throws ExtractorShapeError when tier-2 finds job cards but extracts none", () => {
    const doc = new JSDOM(
      '<!doctype html><body><ul><li class="scaffold-layout__list-item" data-job-id="3901234567">' +
        '<div class="job-card-container"></div></li></ul></body>',
    ).window.document;
    expect(() => linkedInModule.extract({ doc, url: CURATED })).toThrow(ExtractorShapeError);
  });

  it("returns an empty capture, without throwing, when the page genuinely has no jobs", () => {
    const doc = docWith(fixture("no-jobs.voyager.json"));
    expect(linkedInModule.extract({ doc, url: CURATED })).toEqual([]);
  });

  // Tier 1 reads the collection payload the page hydrated, so it is the authority on
  // how many job postings the page holds. Tier 2's card selector ends in a bare
  // [data-job-id], which also matches the split-view detail pane and rail chrome the
  // page renders next to an empty list. One such node must not turn tier 1's
  // confirmed "no jobs here" into a red badge.
  it("keeps a confirmed empty capture when a stray [data-job-id] node starves tier 2", () => {
    const doc = docWith(fixture("no-jobs.voyager.json"), '<div data-job-id="3901234567"></div>');
    expect(linkedInModule.extract({ doc, url: CURATED })).toEqual([]);
  });

  // The mirror of the rule above: without a positive empty-state signal we cannot
  // tell an empty page from a page we stopped understanding, so we fail loud.
  it("throws when models parsed but nothing states the collection is empty", () => {
    const doc = docWith(
      JSON.stringify({
        included: [{ $type: "com.linkedin.voyager.common.Nav", entityUrn: "urn:li:nav:1" }],
      }),
    );
    expect(() => linkedInModule.extract({ doc, url: CURATED })).toThrow(ExtractorShapeError);
  });

  // Two hydrated collections, job cards in both. Scoping the whole document to the
  // first block's element list returns a green badge and half the page.
  it("captures job cards from every hydrated block, not just the one with an element list", () => {
    const card = (id: string, role: string) => ({
      $type: "com.linkedin.voyager.dash.jobs.JobPostingCard",
      entityUrn: `urn:li:fsd_jobPostingCard:${id}`,
      title: role,
      companyName: "Northwind Analytics",
    });
    const first = card("3901234567", "Vice President of Marketing");
    const second = card("3902345678", "Head of Demand Generation");
    const html =
      '<!doctype html><body><code id="bpr-guid-1" style="display:none">' +
      JSON.stringify({
        data: { "*elements": [first.entityUrn], paging: { count: 1, start: 0, total: 1 } },
        included: [first],
      }) +
      '</code><code id="bpr-guid-2" style="display:none">' +
      JSON.stringify({ included: [second] }) +
      "</code></body>";
    const doc = new JSDOM(html).window.document;
    const records = linkedInModule.extract({ doc, url: CURATED });
    expect(records.map((r) => r.role).sort()).toEqual([
      "Head of Demand Generation",
      "Vice President of Marketing",
    ]);
  });

  // An unrelated collection's paging total says nothing about the jobs collection.
  // Reading them together puts a red badge on a page that genuinely has no jobs.
  it("returns an empty capture when an empty jobs block sits beside a busy unrelated one", () => {
    const html =
      '<!doctype html><body><code id="bpr-guid-1" style="display:none">' +
      JSON.stringify({
        data: { "*elements": [], paging: { count: 0, start: 0, total: 0 } },
        included: [],
      }) +
      '</code><code id="bpr-guid-2" style="display:none">' +
      JSON.stringify({
        data: {
          "*elements": ["urn:li:fsd_notification:1"],
          paging: { count: 1, start: 0, total: 25 },
        },
        included: [{ $type: "com.linkedin.voyager.common.Nav", entityUrn: "urn:li:nav:1" }],
      }) +
      "</code></body>";
    const doc = new JSDOM(html).window.document;
    expect(linkedInModule.extract({ doc, url: CURATED })).toEqual([]);
  });

  // The user-visible half of the paging decision: a collection that states it is
  // empty and ships no `paging.total` gets a clean empty capture, not a red badge.
  // Rest.li omits `total` whenever the resource supplies none, so requiring a present
  // zero would put the "jobs were lost" badge on an ordinary empty page — and a badge
  // that fires on normal pages stops meaning anything on the pages that matter.
  it("returns an empty capture when the empty collection carries no paging total", () => {
    const doc = docWith(JSON.stringify({ data: { "*elements": [] }, included: [] }));
    expect(linkedInModule.extract({ doc, url: CURATED })).toEqual([]);
  });

  it("throws when the card entity types churn and the element list still names cards", () => {
    const doc = docWith(
      JSON.stringify({
        data: { "*elements": ["urn:li:fsd_jobPostingCard:3901234567"] },
        included: [
          {
            $type: "com.linkedin.voyager.dash.jobs.HiringOpportunityTile",
            entityUrn: "urn:li:x:1",
          },
        ],
      }),
    );
    expect(() => linkedInModule.extract({ doc, url: CURATED })).toThrow(/1 job cards/);
  });
});
