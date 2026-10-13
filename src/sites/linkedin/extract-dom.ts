import type { CapturedRecord, Signals, TierExtraction } from "../../core/types";
import { sourceFor } from "./surfaces";

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

// A card title wrapper holds two children: the visible label, and a screen reader
// copy that repeats it and, on a verified company, appends a badge phrase. Reading
// the wrapper's whole subtree reports the title twice, and the whitespace collapse
// in text() cannot undo a duplication. Prefer the visible half; markup that carries
// no aria-hidden half falls back to the whole subtree. Scoped to the title because
// that is the only field carrying a duplicated accessible label. The metadata rows
// below mix aria-hidden separators with meaningful text, where the same preference
// would drop content rather than restore it. innerText would also skip the copy,
// but it forces layout and is not dependable in a content script.
function labelText(el: Element | null): string {
  return text(el?.querySelector("[aria-hidden='true']") ?? el);
}

// LinkedIn's component-keyed search UI (issue #81) has none of the markup above. Class
// names are hashed per build and a card carries no job link, so the job id comes from
// the componentkey on the card's button wrapper. The same key also sits on an inner
// div, which is why the selector is pinned to the button. Title, company and location
// are the card's first three paragraphs, in that order, because nothing else about
// them is stable; every paragraph after those is a signal line.
const COMPONENT_CARD = "[role='button'][componentkey^='job-card-component-ref-']";
const COMPONENT_KEY = /^job-card-component-ref-(\d+)$/;

interface CardFields {
  id: string | undefined;
  title: string;
  company: string;
  location: string;
  insight: string;
}

function readLegacyCard(card: Element): CardFields {
  const href = card.querySelector<HTMLAnchorElement>(LINK)?.getAttribute("href") ?? "";
  return {
    id: /\/jobs\/view\/(\d+)/.exec(href)?.[1],
    title: labelText(card.querySelector(TITLE)),
    company: text(card.querySelector(SUB)),
    location: text(card.querySelector(LOC)),
    insight: Array.from(card.querySelectorAll(INSIGHT))
      .map((e) => text(e))
      .join(" "),
  };
}

function readComponentCard(card: Element): CardFields {
  const [title, company, location, ...signals] = Array.from(card.querySelectorAll("p"));
  return {
    id: COMPONENT_KEY.exec(card.getAttribute("componentkey") ?? "")?.[1],
    title: labelText(title ?? null),
    company: text(company ?? null),
    location: text(location ?? null),
    insight: signals.map((e) => text(e)).join(" "),
  };
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

export function extractDom(doc: Document, pageUrl: string): TierExtraction {
  // The component selector is specific enough to trust on its own. CARD ends in a bare
  // [data-job-id] that can match unrelated nodes, so it only gets a say when no
  // component card is present.
  const componentCards = Array.from(doc.querySelectorAll(COMPONENT_CARD));
  const cards = componentCards.length > 0 ? componentCards : Array.from(doc.querySelectorAll(CARD));
  const read = componentCards.length > 0 ? readComponentCard : readLegacyCard;
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
    const { id, title, company, location, insight } = read(card);
    // Same reason as the embedded tier: a churned selector empties every card, and
    // an uncounted skip makes that indistinguishable from a page with no jobs.
    if (!id || !title || !company) {
      droppedCount++;
      continue;
    }
    const url = `https://www.linkedin.com/jobs/view/${id}/`;
    // Counted, not just skipped, for the same reason the drop above is counted.
    if (seen.has(url)) {
      duplicateCount++;
      continue;
    }
    seen.add(url);
    records.push({
      url,
      company,
      role: title,
      location: location || undefined,
      signals: signalsFrom(insight),
      source: sourceFor(pageUrl),
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
