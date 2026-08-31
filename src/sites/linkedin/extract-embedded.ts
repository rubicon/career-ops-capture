import type { CapturedRecord, Signals, TierExtraction } from "../../core/types";
import { sourceFor } from "./source";

// What one hidden <code> block told us. A Voyager collection payload carries its
// hydrated entities in `included`, and its own description of itself in `data`:
// `*elements` names the urn of every element in that collection, and `paging.total`
// counts them. Those two key on urn strings and counts rather than on `$type`, so
// they survive a rename of the entity types the accessors below read.
//
// A page hydrates several of these, one per collection, and each describes only
// itself. Merging them reads one collection's statement as a statement about the
// whole page, which is how a second block's job cards get dropped and how an
// unrelated busy collection masks an empty jobs one. So the scan keeps them apart.
interface ModelBlock {
  included: any[];
  // This block's `*elements`, or null when it carried none. Empty and absent are
  // different: an empty list is the collection saying it holds nothing.
  elementUrns: string[] | null;
  // This block's `paging.total`, or null when it reported none.
  pagingTotal: number | null;
}

// Blocks that parsed. Their count, not the entity count, is what says the tier read
// the page: a collection that holds nothing still hydrates a block, with `included`
// empty, and that is a page we understood rather than a page we failed to parse.
function scanEmbeddedModels(doc: Document): ModelBlock[] {
  const blocks: ModelBlock[] = [];
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
    const elements = hasData ? data["*elements"] : undefined;
    const total = hasData ? data.paging?.total : undefined;
    blocks.push({
      included: hasIncluded ? obj.included : [],
      elementUrns: Array.isArray(elements)
        ? elements.filter((u: unknown): u is string => typeof u === "string")
        : null,
      pagingTotal: typeof total === "number" ? total : null,
    });
  }
  return blocks;
}

function allIncluded(blocks: ModelBlock[]): any[] {
  return blocks.flatMap((b) => b.included);
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

// The cards on the page are whichever entities the collections' element lists name,
// because those lists are what the page itself calls its contents. Returns the
// entities to read, plus the count of named cards that resolved to no entity at all:
// those are cards we lost, not cards the page does not have.
//
// Scoping is per block, because an element list only describes the collection it
// belongs to. A block whose list names no job posting is not saying the page has
// none: the cards can live in a sibling block, hydrated loose or through a different
// collection. For such a block, and for one carrying no list at all, the `$type` hint
// is all we have and we read every entity of that block it matches. Deciding the
// whole document off the first list that names a job urn is how the cards outside it
// disappear.
function selectCards(blocks: ModelBlock[]): { cards: any[]; unresolved: number } {
  // Element urns resolve against every entity on the page, not only the ones that
  // arrived in the same block: a collection routinely names elements a sibling block
  // hydrated. Only the *scoping* is per block; the lookup table is not.
  const byUrn = new Map<string, any>();
  for (const e of allIncluded(blocks)) {
    const urn = e?.entityUrn;
    if (typeof urn === "string" && !byUrn.has(urn)) byUrn.set(urn, e);
  }
  const cards: any[] = [];
  // Keyed by urn where there is one, else by the entity itself, so a card two blocks
  // both claim is counted once rather than reported as a duplicate capture.
  const taken = new Set<unknown>();
  let unresolved = 0;
  for (const block of blocks) {
    const jobUrns = (block.elementUrns ?? []).filter((u) => JOB_URN.test(u));
    if (jobUrns.length > 0) {
      for (const urn of jobUrns) {
        if (taken.has(urn)) continue;
        taken.add(urn);
        // The urn already said this element is a job posting, so we do not re-test
        // the entity's `$type`: that is the field most likely to have been renamed.
        const e = byUrn.get(urn);
        if (e) cards.push(e);
        else unresolved++;
      }
      continue;
    }
    for (const e of block.included) {
      if (!mentionsJobPosting(e)) continue;
      const key = typeof e?.entityUrn === "string" ? e.entityUrn : e;
      if (taken.has(key)) continue;
      taken.add(key);
      cards.push(e);
    }
  }
  return { cards, unresolved };
}

// A collection states it is empty when it hydrated an element list, that list names
// no job posting, and its own `paging.total` agrees. The total has to come from the
// same block as the list it corroborates: a page's unrelated collections report their
// own totals, and reading one of those against the jobs list turns a genuinely empty
// page into a red badge.
//
// An ABSENT total still confirms, and that is deliberate rather than an oversight.
// The element list is the positive statement — the collection saying it holds
// nothing. The total is here to catch a *contradiction* (list empty, total says 25,
// so do not trust the list); with no total there is no contradiction, only less
// corroboration. Requiring a present zero instead would fail loud on every empty
// collection whose payload omits it, which is the false-red-badge class this parser
// exists to avoid: a badge that fires on ordinary empty pages stops meaning "jobs
// were lost" on the pages where jobs really were.
//
// Neither paging field is usable as a damage signal here, per Rest.li's own server
// (`restli-server/.../RestUtils.buildMetadata`), the framework this payload's `$type`
// names:
//   - `metadata.removeTotal()` runs whenever the resource supplies no total, so an
//     absent total is ordinary output, not a truncated payload. `total` is likewise
//     defaulted (`total: int = 0`) in CollectionMetadata, i.e. optional on the wire.
//   - `metadata.setCount(pagingContext.getCount())` takes count from the *request's*
//     paging context, not from the elements returned, so a non-zero count beside an
//     empty list is "asked for 20, got 0" — an empty page, not a contradiction.
//
// What remains genuinely undecidable with the evidence available: a payload that is
// semantically incomplete (`*elements: []`, `included: []`) is byte-identical to a
// collection that is simply empty. Byte truncation is not the shape in question —
// that fails `JSON.parse` and never becomes a block at all. Separating the two needs
// a signal this payload does not carry: a real capture establishing whether curated
// collections always ship paging, or the rendered "no matching jobs" empty state.
// Until one of those exists we default to trusting the element list, because the
// other three conjuncts at the call site already require that no card was selected,
// none was lost, and no job-posting entity arrived anywhere on the page.
function blockConfirmsEmpty(block: ModelBlock): boolean {
  if (block.elementUrns === null) return false;
  if (block.elementUrns.some((u) => JOB_URN.test(u))) return false;
  return block.pagingTotal === null || block.pagingTotal === 0;
}

export function extractEmbedded(doc: Document, pageUrl: string): TierExtraction {
  const blocks = scanEmbeddedModels(doc);
  // No model blocks parsed at all, so this tier has nothing to say about the page.
  if (blocks.length === 0) {
    return {
      records: [],
      recognized: false,
      cardCount: 0,
      droppedCount: 0,
      duplicateCount: 0,
      emptyStateConfirmed: false,
    };
  }
  const { cards, unresolved } = selectCards(blocks);
  // The page states it is empty when some collection on it says so on its own terms,
  // no card was selected or lost anywhere, and no job-posting entity came along
  // anyway. Anything short of all three leaves us unable to tell an empty page from a
  // page we stopped understanding, and the module fails loud on that.
  const emptyStateConfirmed =
    blocks.some(blockConfirmsEmpty) &&
    cards.length === 0 &&
    unresolved === 0 &&
    !allIncluded(blocks).some(mentionsJobPosting);
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
      source: sourceFor(pageUrl),
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
