import type { CapturedRecord, Signals, TierExtraction } from "../../core/types";

const SOURCE = "linkedin-topapplicant";

// What the hidden <code> blocks told us. A Voyager collection payload carries the
// hydrated entities in `included`, and the collection's own description of itself in
// `data`: `*elements` lists the urn of every element on the page, and `paging.total`
// counts them. Those two are the page's own statement of how many jobs it holds, and
// they key on urn strings and counts rather than on `$type`, so they survive a rename
// of the entity types the accessors below read.
interface ModelScan {
  // Model blocks that parsed. This, not the entity count, is what says the tier read
  // the page: a collection that holds nothing still hydrates a block, with `included`
  // empty, and that is a page we understood rather than a page we failed to parse.
  blockCount: number;
  included: any[];
  // `*elements` entries across every parsed block, and whether any block carried one.
  elementUrns: string[];
  hasElementList: boolean;
  // Largest `paging.total` seen, or null when no block reported one.
  pagingTotal: number | null;
}

function scanEmbeddedModels(doc: Document): ModelScan {
  const scan: ModelScan = {
    blockCount: 0,
    included: [],
    elementUrns: [],
    hasElementList: false,
    pagingTotal: null,
  };
  for (const el of Array.from(doc.querySelectorAll("code"))) {
    const text = el.textContent?.trim();
    if (!text || text[0] !== "{") continue;
    let obj: any;
    try {
      obj = JSON.parse(text);
    } catch {
      continue; /* not a model block */
    }
    const hasIncluded = Array.isArray(obj?.included);
    const data = obj?.data;
    const hasData = !!data && typeof data === "object";
    if (!hasIncluded && !hasData) continue;
    scan.blockCount++;
    if (hasIncluded) scan.included.push(...obj.included);
    const elements = hasData ? data["*elements"] : undefined;
    if (Array.isArray(elements)) {
      scan.hasElementList = true;
      scan.elementUrns.push(...elements.filter((u: unknown): u is string => typeof u === "string"));
    }
    const total = hasData ? data.paging?.total : undefined;
    if (typeof total === "number") scan.pagingTotal = Math.max(scan.pagingTotal ?? 0, total);
  }
  return scan;
}

const JOB_URN = /jobposting/i;

// --- churn-isolated accessors: confirm these paths against a real fixture ---
// Only a hint, never the card count. `$type` substring matching on "jobposting" also
// catches the JobPosting projection a card points at and any recommendation wrapper
// around it, none of which are a second card on the page. It is used to *withhold*
// an empty-state confirmation, where over-matching is the safe direction, and as the
// fallback card test when a payload carries no element list to key on.
function mentionsJobPosting(e: any): boolean {
  const t: string = e?.$type ?? "";
  return typeof t === "string" && JOB_URN.test(t);
}
function pickJobId(e: any): string | null {
  const urn: string = e?.entityUrn ?? e?.["*jobPosting"] ?? "";
  const m = /(\d{6,})/.exec(urn);
  return m?.[1] ?? null;
}
function pickTitle(e: any): string {
  return String(e?.title ?? e?.jobPostingTitle ?? "").trim();
}
function pickCompany(e: any): string {
  return String(e?.companyName ?? e?.primarySubtitle?.text ?? "").trim();
}
function pickLocation(e: any): string {
  return String(e?.secondarySubtitle?.text ?? e?.formattedLocation ?? "").trim();
}
function pickInsightText(e: any): string {
  const raw =
    e?.relevanceInsight?.text?.text ??
    e?.jobInsights?.[0]?.text ??
    (Array.isArray(e?.footerItems) ? e.footerItems.map((f: any) => f?.text).join(" ") : "") ??
    "";
  return String(raw);
}
// -------------------------------------------------------------------------

function signalsFromInsight(text: string): Signals {
  const s: Signals = {};
  if (/top applicant/i.test(text)) s.topApplicant = true;
  const m = /(\d{1,3})%\s*(match|fit)/i.exec(text);
  if (m) s.matchPercent = Number(m[1]);
  if (/easy apply/i.test(text)) s.easyApply = true;
  if (/actively (reviewing|recruiting)/i.test(text)) s.activelyRecruiting = true;
  const days = /posted\s+(\d+)\s+day/i.exec(text);
  if (days) s.recencyDays = Number(days[1]);
  const applicants = /(\d+)\+?\s+applicants?/i.exec(text);
  if (applicants) s.applicantCount = Number(applicants[1]);
  return s;
}

// The cards on the page are whichever entities the collection's element list names,
// because that list is what the page itself calls its contents. Returns the entities
// to read, plus the count of named cards that resolved to no entity at all: those are
// cards we lost, not cards the page does not have.
//
// An element list only describes the one collection it belongs to, so a list naming
// no job posting is not a statement that the page has none: a second block can carry
// the cards outside it. In that case, and when no block carried a list at all, the
// `$type` hint is all we have and we read every entity it matches.
function selectCards(scan: ModelScan): { cards: any[]; unresolved: number } {
  const jobUrns = scan.elementUrns.filter((u) => JOB_URN.test(u));
  if (jobUrns.length === 0) {
    return { cards: scan.included.filter(mentionsJobPosting), unresolved: 0 };
  }
  const byUrn = new Map<string, any>();
  for (const e of scan.included) {
    const urn = e?.entityUrn;
    if (typeof urn === "string" && !byUrn.has(urn)) byUrn.set(urn, e);
  }
  const cards: any[] = [];
  let unresolved = 0;
  for (const urn of jobUrns) {
    // The urn already said this element is a job posting, so we do not re-test the
    // entity's `$type`: that is the field most likely to have been renamed.
    const e = byUrn.get(urn);
    if (e) cards.push(e);
    else unresolved++;
  }
  return { cards, unresolved };
}

export function extractEmbedded(doc: Document, _url: string): TierExtraction {
  const scan = scanEmbeddedModels(doc);
  // No model blocks parsed at all, so this tier has nothing to say about the page.
  if (scan.blockCount === 0) {
    return {
      records: [],
      recognized: false,
      cardCount: 0,
      droppedCount: 0,
      duplicateCount: 0,
      emptyStateConfirmed: false,
    };
  }
  const { cards, unresolved } = selectCards(scan);
  // The page states it is empty when it hydrated a collection, that collection names
  // no job posting, its paging total agrees, and no job-posting entity came along
  // anyway. Anything short of all four leaves us unable to tell an empty page from a
  // page we stopped understanding, and the module fails loud on that.
  const emptyStateConfirmed =
    scan.hasElementList &&
    cards.length === 0 &&
    unresolved === 0 &&
    !scan.included.some(mentionsJobPosting) &&
    (scan.pagingTotal === null || scan.pagingTotal === 0);
  const records: CapturedRecord[] = [];
  const seen = new Set<string>();
  let droppedCount = unresolved;
  let duplicateCount = 0;
  for (const e of cards) {
    const id = pickJobId(e);
    const title = pickTitle(e);
    const company = pickCompany(e);
    // A card we cannot name is a card lost. Count it: a churned id/title/company
    // accessor drops every card at once, which the caller must not read as success.
    if (!id || !title || !company) {
      droppedCount++;
      continue;
    }
    const url = `https://www.linkedin.com/jobs/view/${id}/`;
    // Counted, not just skipped: records + dropped + duplicates has to account for
    // every card, or the module reads its decision off numbers that do not add up.
    if (seen.has(url)) {
      duplicateCount++;
      continue;
    }
    seen.add(url);
    records.push({
      url,
      company,
      role: title,
      location: pickLocation(e) || undefined,
      signals: signalsFromInsight(pickInsightText(e)),
      source: SOURCE,
      capturedAt: new Date().toISOString(),
    });
  }
  // "recognized" = the model blocks parsed, so this tier read the page. It is
  // deliberately not "cards.length > 0": a curated collection can legitimately
  // hold no jobs, and that is a clean empty capture rather than an unread page.
  // Whether zero records here is legitimate is the module's call, off the counts
  // and off `emptyStateConfirmed`.
  return {
    records,
    recognized: true,
    cardCount: cards.length + unresolved,
    droppedCount,
    duplicateCount,
    emptyStateConfirmed,
  };
}
