import type { CapturedRecord, Signals, TierExtraction } from "../../core/types";

const SOURCE = "linkedin-topapplicant";

// Confirm these against a real cards.html capture; they are the churn points.
const CARD = "li.jobs-search-results__list-item, li.scaffold-layout__list-item, [data-job-id]";
const LINK = "a[href*='/jobs/view/']";
const TITLE = "a[href*='/jobs/view/'] strong, .job-card-list__title, .artdeco-entity-lockup__title";
const SUB = ".artdeco-entity-lockup__subtitle";
const LOC = ".artdeco-entity-lockup__caption, .job-card-container__metadata-item";
const INSIGHT =
  ".job-card-container__job-insight-text, .job-card-list__insight, .job-card-container__footer-item";

function text(el: Element | null): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function signalsFrom(t: string): Signals {
  const s: Signals = {};
  if (/top applicant/i.test(t)) s.topApplicant = true;
  const m = /(\d{1,3})%\s*(match|fit)/i.exec(t);
  if (m) s.matchPercent = Number(m[1]);
  if (/easy apply/i.test(t)) s.easyApply = true;
  if (/actively (reviewing|recruiting)/i.test(t)) s.activelyRecruiting = true;
  const days = /posted\s+(\d+)\s+day/i.exec(t);
  if (days) s.recencyDays = Number(days[1]);
  return s;
}

// The rendered DOM cannot state that a collection is empty. No card container matched
// is equally "this page has no jobs" and "CARD stopped matching", so this tier never
// confirms an empty state; only the embedded collection payload can.
const EMPTY_STATE_CONFIRMED = false;

export function extractDom(doc: Document, _url: string): TierExtraction {
  const cards = Array.from(doc.querySelectorAll(CARD));
  if (cards.length === 0) {
    return {
      records: [],
      recognized: false,
      cardCount: 0,
      droppedCount: 0,
      duplicateCount: 0,
      emptyStateConfirmed: EMPTY_STATE_CONFIRMED,
    };
  }
  const records: CapturedRecord[] = [];
  const seen = new Set<string>();
  let droppedCount = 0;
  let duplicateCount = 0;
  for (const card of cards) {
    const link = card.querySelector<HTMLAnchorElement>(LINK);
    const href = link?.getAttribute("href") ?? "";
    const idm = /\/jobs\/view\/(\d+)/.exec(href);
    const title = text(card.querySelector(TITLE));
    const company = text(card.querySelector(SUB));
    // Same reason as the embedded tier: a churned selector empties every card, and
    // an uncounted skip makes that indistinguishable from a page with no jobs.
    if (!idm || !title || !company) {
      droppedCount++;
      continue;
    }
    const url = `https://www.linkedin.com/jobs/view/${idm[1]}/`;
    // Counted, not just skipped, for the same reason the drop above is counted.
    if (seen.has(url)) {
      duplicateCount++;
      continue;
    }
    seen.add(url);
    const insight = Array.from(card.querySelectorAll(INSIGHT))
      .map((e) => text(e))
      .join(" ");
    records.push({
      url,
      company,
      role: title,
      location: text(card.querySelector(LOC)) || undefined,
      signals: signalsFrom(insight),
      source: SOURCE,
      capturedAt: new Date().toISOString(),
    });
  }
  return {
    records,
    recognized: true,
    cardCount: cards.length,
    droppedCount,
    duplicateCount,
    emptyStateConfirmed: EMPTY_STATE_CONFIRMED,
  };
}
