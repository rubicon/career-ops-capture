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

function docWithEmbedded(...blocks: string[]): Document {
  // LinkedIn hydrates from hidden <code> blocks; replicate that shape. A real page
  // carries several of them, one per collection it hydrated.
  const codes = blocks
    .map(
      (json, i) =>
        `<code id="bpr-guid-${i + 1}" style="display:none">${json.replace(/</g, "\\u003c")}</code>`,
    )
    .join("");
  return new JSDOM(`<!doctype html><body>${codes}</body>`).window.document;
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

  it("drops no card from the healthy fixture", () => {
    const r = extractEmbedded(docWithEmbedded(raw), CURATED);
    expect(r.cardCount).toBe(3);
    expect(r.droppedCount).toBe(0);
  });

  // The two cases the caller has to tell apart: a page that really holds no jobs,
  // and a page whose job cards we can no longer read.
  it("reports a genuinely empty collection as zero cards, zero dropped", () => {
    const empty = readFileSync("src/sites/linkedin/fixtures/no-jobs.voyager.json", "utf-8");
    const r = extractEmbedded(docWithEmbedded(empty), CURATED);
    expect(r.recognized).toBe(true);
    expect(r.cardCount).toBe(0);
    expect(r.droppedCount).toBe(0);
    expect(r.records).toEqual([]);
  });

  it("reports a churned title accessor as cards found and every card dropped", () => {
    const churned = readFileSync("src/sites/linkedin/fixtures/churned-title.voyager.json", "utf-8");
    const r = extractEmbedded(docWithEmbedded(churned), CURATED);
    expect(r.recognized).toBe(true);
    expect(r.cardCount).toBe(2);
    expect(r.droppedCount).toBe(2);
    expect(r.records).toEqual([]);
  });

  // An empty page is only "empty" when the payload says so. The collection block
  // carries that statement in `*elements` and `paging.total`, both of which key on
  // urn strings and counts rather than on `$type`, so they survive a rename of the
  // entity types the accessors read.
  it("confirms the empty state from the collection block, not from a filler entity", () => {
    const empty = readFileSync("src/sites/linkedin/fixtures/no-jobs.voyager.json", "utf-8");
    const r = extractEmbedded(docWithEmbedded(empty), CURATED);
    expect(r.emptyStateConfirmed).toBe(true);
  });

  it("does not confirm an empty state from parsed models with no collection block", () => {
    const payload = JSON.stringify({
      included: [{ $type: "com.linkedin.voyager.common.Nav", entityUrn: "urn:li:nav:1" }],
    });
    const r = extractEmbedded(docWithEmbedded(payload), CURATED);
    expect(r.recognized).toBe(true);
    expect(r.emptyStateConfirmed).toBe(false);
  });

  it("does not confirm an empty state when paging reports jobs the element list omits", () => {
    const payload = JSON.stringify({
      data: { "*elements": [], paging: { count: 0, start: 0, total: 25 } },
      included: [],
    });
    expect(extractEmbedded(docWithEmbedded(payload), CURATED).emptyStateConfirmed).toBe(false);
  });

  // The `$type` of a job card is exactly the churn point the accessors cannot rely
  // on. The collection's own element urns still name the cards, so a page whose card
  // entities were renamed is a starved parser, not an empty page.
  it("counts job cards the element list names even when every $type has churned", () => {
    const payload = JSON.stringify({
      data: {
        "*elements": [
          "urn:li:fsd_jobPostingCard:3901234567",
          "urn:li:fsd_jobPostingCard:3902345678",
        ],
      },
      included: [
        { $type: "com.linkedin.voyager.dash.jobs.HiringOpportunityTile", entityUrn: "urn:li:x:1" },
      ],
    });
    const r = extractEmbedded(docWithEmbedded(payload), CURATED);
    expect(r.recognized).toBe(true);
    expect(r.emptyStateConfirmed).toBe(false);
    expect(r.cardCount).toBe(2);
    expect(r.records).toEqual([]);
  });

  // `$type` substring matching on "jobposting" also catches the underlying
  // JobPosting projection a card points at. That entity is not a second card, and
  // counting it as one reports a dropped card on a page where nothing was lost.
  it("does not count a sibling JobPosting projection as a second card", () => {
    const payload = JSON.stringify({
      data: { "*elements": ["urn:li:fsd_jobPostingCard:3901234567"] },
      included: [
        {
          $type: "com.linkedin.voyager.dash.jobs.JobPostingCard",
          entityUrn: "urn:li:fsd_jobPostingCard:3901234567",
          title: "Vice President of Marketing",
          companyName: "Northwind Analytics",
        },
        {
          $type: "com.linkedin.voyager.dash.jobs.JobPosting",
          entityUrn: "urn:li:fsd_jobPosting:3901234567",
        },
      ],
    });
    const r = extractEmbedded(docWithEmbedded(payload), CURATED);
    expect(r.cardCount).toBe(1);
    expect(r.droppedCount).toBe(0);
    expect(r.records.length).toBe(1);
  });

  // records + dropped + duplicates must account for every card the tier counted,
  // or the next change reads a decision off numbers that do not add up.
  it("counts a deduplicated card, so the buckets account for every card seen", () => {
    const card = {
      $type: "com.linkedin.voyager.dash.jobs.JobPostingCard",
      title: "Vice President of Marketing",
      companyName: "Northwind Analytics",
    };
    const payload = JSON.stringify({
      data: {
        "*elements": [
          "urn:li:fsd_jobPostingCard:3901234567",
          "urn:li:fsd_jobPostingCard:3901234567b",
        ],
      },
      included: [
        { ...card, entityUrn: "urn:li:fsd_jobPostingCard:3901234567" },
        { ...card, entityUrn: "urn:li:fsd_jobPostingCard:3901234567b" },
      ],
    });
    const r = extractEmbedded(docWithEmbedded(payload), CURATED);
    expect(r.cardCount).toBe(2);
    expect(r.records.length).toBe(1);
    expect(r.duplicateCount).toBe(1);
    expect(r.records.length + r.droppedCount + r.duplicateCount).toBe(r.cardCount);
  });

  // An element list describes the one collection it belongs to. A page can hydrate a
  // second block for something else entirely and carry the job cards outside it, so
  // an element list that names no job posting must not be read as "there are none":
  // it only means the cards were not hydrated through that collection.
  it("still reads job cards hydrated outside an unrelated collection's element list", () => {
    const payload = JSON.stringify({
      data: { "*elements": ["urn:li:fsd_notification:99"] },
      included: [
        {
          $type: "com.linkedin.voyager.dash.jobs.JobPostingCard",
          entityUrn: "urn:li:fsd_jobPostingCard:3901234567",
          title: "Vice President of Marketing",
          companyName: "Northwind Analytics",
        },
      ],
    });
    const r = extractEmbedded(docWithEmbedded(payload), CURATED);
    expect(r.emptyStateConfirmed).toBe(false);
    expect(r.cardCount).toBe(1);
    expect(r.records.length).toBe(1);
  });

  // The same rule, one block over. An element list scopes to the block that carries
  // it, so a page hydrating a job collection *and* a second block of job cards must
  // yield both: reading the whole document off the first list drops every card the
  // list does not happen to name, which is the silent loss this tier exists to stop.
  const namedCard = {
    $type: "com.linkedin.voyager.dash.jobs.JobPostingCard",
    entityUrn: "urn:li:fsd_jobPostingCard:3901234567",
    title: "Vice President of Marketing",
    companyName: "Northwind Analytics",
  };
  const unnamedCard = {
    $type: "com.linkedin.voyager.dash.jobs.JobPostingCard",
    entityUrn: "urn:li:fsd_jobPostingCard:3902345678",
    title: "Head of Demand Generation",
    companyName: "Contoso Systems",
  };

  it("reads cards from a second block that carries no element list of its own", () => {
    const collection = JSON.stringify({
      data: { "*elements": [namedCard.entityUrn], paging: { count: 1, start: 0, total: 1 } },
      included: [namedCard],
    });
    const loose = JSON.stringify({ included: [unnamedCard] });
    const r = extractEmbedded(docWithEmbedded(collection, loose), CURATED);
    expect(r.cardCount).toBe(2);
    expect(r.droppedCount).toBe(0);
    expect(r.records.map((x) => x.role).sort()).toEqual([
      "Head of Demand Generation",
      "Vice President of Marketing",
    ]);
  });

  it("reads cards from a second block whose element list names no job posting", () => {
    const collection = JSON.stringify({
      data: { "*elements": [namedCard.entityUrn], paging: { count: 1, start: 0, total: 1 } },
      included: [namedCard],
    });
    const other = JSON.stringify({
      data: {
        "*elements": ["urn:li:fsd_notification:99"],
        paging: { count: 1, start: 0, total: 1 },
      },
      included: [unnamedCard],
    });
    const r = extractEmbedded(docWithEmbedded(collection, other), CURATED);
    expect(r.cardCount).toBe(2);
    expect(r.records.length).toBe(2);
  });

  // A `paging.total` describes the collection it ships with. Corroborating one
  // block's empty element list against another block's total reports a page full of
  // jobs whenever anything unrelated on it is non-empty, and fails loud on a page
  // that genuinely holds none.
  it("confirms an empty collection beside an unrelated block reporting a paging total", () => {
    const emptyJobs = JSON.stringify({
      data: { "*elements": [], paging: { count: 0, start: 0, total: 0 } },
      included: [],
    });
    const unrelated = JSON.stringify({
      data: {
        "*elements": ["urn:li:fsd_notification:1", "urn:li:fsd_notification:2"],
        paging: { count: 2, start: 0, total: 25 },
      },
      included: [{ $type: "com.linkedin.voyager.common.Nav", entityUrn: "urn:li:nav:1" }],
    });
    const r = extractEmbedded(docWithEmbedded(emptyJobs, unrelated), CURATED);
    expect(r.cardCount).toBe(0);
    expect(r.emptyStateConfirmed).toBe(true);
  });
});
