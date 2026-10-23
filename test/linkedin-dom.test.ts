import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { extractDom } from "../src/sites/linkedin/extract-dom";
import { ExtractorShapeError } from "../src/sites/linkedin/index";

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
    expect(r.cardCount).toBe(5);
    expect(r.droppedCount).toBe(0);
  });

  // The title wrapper holds the visible label and a screen reader copy that repeats
  // it, so reading the wrapper's whole subtree reports the title twice. The copy
  // appends a badge phrase on a verified company, and whether a space separates the
  // two halves depends on the markup, so neither shape can be repaired after the
  // fact.
  it("reads the visible label once when the title carries a screen reader copy", () => {
    const roles = extractDom(doc(), CURATED).records.map((r) => r.role);
    expect(roles).toContain("Marketing Director");
    expect(roles).toContain("Senior B2B Marketing Manager");
  });

  // The other half of that rule: markup with a single label has no visible half to
  // prefer, and must keep reading the whole subtree.
  it("leaves a title that carries no screen reader copy unchanged", () => {
    const roles = extractDom(doc(), CURATED).records.map((r) => r.role);
    expect(roles).toContain("Vice President of Marketing");
  });

  // The rendered DOM has no statement of its own that a collection is empty: no
  // matching card container is equally "no jobs" and "the selector churned". Only
  // the embedded collection payload can confirm an empty page.
  it("never confirms an empty state, on a healthy page or an empty one", () => {
    expect(extractDom(doc(), CURATED).emptyStateConfirmed).toBe(false);
    const empty = new JSDOM("<!doctype html><body><p>x</p></body>").window.document;
    expect(extractDom(empty, CURATED).emptyStateConfirmed).toBe(false);
  });

  it("counts a deduplicated card, so the buckets account for every card seen", () => {
    const card = (id: string) =>
      `<li class="scaffold-layout__list-item" data-job-id="${id}">` +
      `<a class="job-card-list__title" href="/jobs/view/${id}/"><strong>VP Marketing</strong></a>` +
      '<div class="artdeco-entity-lockup__subtitle">Northwind Analytics</div></li>';
    const dup = new JSDOM(
      `<!doctype html><body><ul>${card("3901234567")}${card("3901234567")}</ul></body>`,
    ).window.document;
    const r = extractDom(dup, CURATED);
    expect(r.cardCount).toBe(2);
    expect(r.records.length).toBe(1);
    expect(r.duplicateCount).toBe(1);
    expect(r.records.length + r.droppedCount + r.duplicateCount).toBe(r.cardCount);
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

// LinkedIn's 2026 search UI (issue #81) drops the artdeco list markup. Class names are
// hashed per build, there is no job link on a card, and the only stable hook is a
// componentkey that carries the job id. The fixture is a scrubbed subset of a real
// /jobs/search-results/ capture, with synthetic ids and company names.
describe("extractDom on the component-keyed search results", () => {
  const SEARCH = "https://www.linkedin.com/jobs/search-results/?keywords=chief+marketing+officer";

  function searchDoc(): Document {
    const body = readFileSync("src/sites/linkedin/fixtures/search-results-cards.html", "utf-8");
    return new JSDOM(`<!doctype html><body><main>${body}</main></body>`).window.document;
  }

  // Each card repeats its componentkey on an inner wrapper, so counting nodes by
  // componentkey alone would report every job twice.
  it("counts each card once and drops none from the healthy fixture", () => {
    const r = extractDom(searchDoc(), SEARCH);
    expect(r.recognized).toBe(true);
    expect(r.cardCount).toBe(8);
    expect(r.droppedCount).toBe(0);
    expect(r.duplicateCount).toBe(0);
    expect(r.records.length).toBe(8);
  });

  it("builds the job url from the card's componentkey, since cards carry no job link", () => {
    const urls = extractDom(searchDoc(), SEARCH).records.map((r) => r.url);
    expect(urls[0]).toBe("https://www.linkedin.com/jobs/view/9000000001/");
    expect(urls[7]).toBe("https://www.linkedin.com/jobs/view/9000000008/");
  });

  it("reads role, company and location from each card", () => {
    const rows = extractDom(searchDoc(), SEARCH).records.map((r) => [
      r.role,
      r.company,
      r.location,
    ]);
    expect(rows).toEqual([
      ["Chief Brand & Sales Officer", "Example Harborview Association", "Elmstead, ZZ (Hybrid)"],
      ["Chief Marketing Officer", "Example Quillbrook Ledger", "United States (Remote)"],
      ["Chief Merchandise Officer", "Example Molar / Dr. Crown", "Pinecrest Coast Area (Hybrid)"],
      ["SVP Marketing", "Example Candlewick Credit", "United States (Remote)"],
      ["Chief Marketing Officer", "Example Plain Thread", "Oakmere, ZZ (On-site)"],
      ["Chief Marketing Officer", "Example Spectrum Partners", "United States (Remote)"],
      ["Head of Demand & Client Journeys", "Example Marlin Lending", "Larkfield, ZZ (On-site)"],
      ["US Head, Aurora Franchise", "Example Northgate Biologics", "Northfield Park, ZZ"],
    ]);
  });

  // The title paragraph holds a screen reader copy, which appends "(Verified job)" on
  // a verified company, and the visible label. Neither half may leak into the other.
  it("reports the title once, without the verified-job phrase", () => {
    for (const r of extractDom(searchDoc(), SEARCH).records) {
      expect(r.role).not.toMatch(/verified job/i);
      expect(r.role.length).toBeLessThan(60);
    }
  });

  it("captures only the signals the card states", () => {
    const sig = extractDom(searchDoc(), SEARCH).records.map((r) => r.signals);
    expect(sig[0]).toEqual({ topApplicant: true, recencyDays: 5 });
    expect(sig[1]).toEqual({ topApplicant: true, easyApply: true });
    expect(sig[4]).toEqual({ activelyRecruiting: true, easyApply: true });
    // Relative ages in weeks, months and hours are not read, and a card that states
    // no signal gets none.
    expect(sig[6]).toEqual({});
    expect(sig[7]).toEqual({});
  });

  it("labels every record with the search surface", () => {
    const sources = new Set(extractDom(searchDoc(), SEARCH).records.map((r) => r.source));
    expect([...sources]).toEqual(["linkedin-search"]);
  });

  // The job id is the only thing the key carries, so a key that stops ending in digits
  // is a card that cannot become a record, and must show up as dropped.
  it("counts a card whose componentkey carries no numeric id as dropped", () => {
    const card = (key: string) =>
      `<div role="button" componentkey="${key}"><p>VP Marketing</p><p>Northwind Analytics</p><p>Remote</p></div>`;
    const doc = new JSDOM(
      `<!doctype html><body>${card("job-card-component-ref-3901234567")}${card("job-card-component-ref-")}</body>`,
    ).window.document;
    const r = extractDom(doc, SEARCH);
    expect(r.cardCount).toBe(2);
    expect(r.records.length).toBe(1);
    expect(r.droppedCount).toBe(1);
    const bad = new JSDOM(`<!doctype html><body>${card("job-card-component-ref-abc")}</body>`)
      .window.document;
    const b = extractDom(bad, SEARCH);
    expect(b.recognized).toBe(true);
    expect(b.droppedCount).toBe(1);
    expect(b.records).toEqual([]);
  });

  it("counts a repeated job id as a duplicate, so the buckets account for every card", () => {
    const card = `<div role="button" componentkey="job-card-component-ref-3901234567"><p>VP Marketing</p><p>Northwind Analytics</p><p>Remote</p></div>`;
    const doc = new JSDOM(`<!doctype html><body>${card}${card}</body>`).window.document;
    const r = extractDom(doc, SEARCH);
    expect(r.cardCount).toBe(2);
    expect(r.records.length).toBe(1);
    expect(r.duplicateCount).toBe(1);
    expect(r.records.length + r.droppedCount + r.duplicateCount).toBe(r.cardCount);
  });

  it("reports cards found and every card dropped when the card layout churns", () => {
    const churned = new JSDOM(
      '<!doctype html><body><div role="button" componentkey="job-card-component-ref-3901234567">' +
        '<div componentkey="job-card-component-ref-3901234567"></div></div></body>',
    ).window.document;
    const r = extractDom(churned, SEARCH);
    expect(r.recognized).toBe(true);
    expect(r.cardCount).toBe(1);
    expect(r.droppedCount).toBe(1);
    expect(r.records).toEqual([]);
  });

  // The title is found by its screen reader copy, not by being the first paragraph, so
  // a badge line ahead of it cannot shift the company and location into the wrong
  // fields.
  it("finds the title by its screen reader copy when a badge paragraph leads the card", () => {
    const card =
      '<div role="button" componentkey="job-card-component-ref-3901234567">' +
      "<p>Promoted</p>" +
      '<p><span>VP Marketing (Verified job)</span><span aria-hidden="true">VP Marketing</span></p>' +
      "<p>Northwind Analytics</p><p>Remote</p><p>Easy Apply</p></div>";
    const doc = new JSDOM(`<!doctype html><body>${card}</body>`).window.document;
    const r = extractDom(doc, SEARCH);
    expect(r.records.map((x) => [x.role, x.company, x.location])).toEqual([
      ["VP Marketing", "Northwind Analytics", "Remote"],
    ]);
    expect(r.records[0]?.signals).toEqual({ easyApply: true });
  });

  // Fewer paragraphs than title, company and location means the layout moved. Reading
  // them positionally anyway would report a location as a company.
  it("throws ExtractorShapeError when too few paragraphs follow the title", () => {
    const card =
      '<div role="button" componentkey="job-card-component-ref-3901234567">' +
      '<p><span>VP Marketing (Verified job)</span><span aria-hidden="true">VP Marketing</span></p>' +
      "<p>Northwind Analytics</p></div>";
    const doc = new JSDOM(`<!doctype html><body>${card}</body>`).window.document;
    expect(() => extractDom(doc, SEARCH)).toThrow(ExtractorShapeError);
  });
});
