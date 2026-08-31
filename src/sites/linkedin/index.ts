import type { CapturedRecord, ExtractContext, SiteModule, TierExtraction } from "../../core/types";
import { extractEmbedded } from "./extract-embedded";
import { extractDom } from "./extract-dom";
import { detectAuthState } from "./auth";

// Thrown when no known extraction tier recognizes the page shape. Drives the
// fail-loud red badge. Never silently drop.
export class ExtractorShapeError extends Error {
  constructor(msg = "LinkedIn extractor recognized no known shape, needs update") {
    super(msg);
    this.name = "ExtractorShapeError";
  }
}

// The curated collections, plus the job search route. LinkedIn serves the
// "Jobs where you'd be a top applicant" module's own results from
// /jobs/search-results/, not from /jobs/collections/, so a module that claims
// only the collections captures nothing on the surface the user actually lands
// on. A search the user ran themselves is a curated surface for our purposes;
// see PRIVACY.md, which states that these pages are read.
const CURATED_RE =
  /linkedin\.com\/jobs\/(collections\/(top-applicant|recommended)|search-results)/i;
// Also claim LinkedIn's auth surfaces: a passive open of a curated URL can redirect
// to a login wall. Claiming these lets detectAuthState() report
// logged-out and drive the re-auth prompt instead of silently no-module'ing.
const AUTH_RE = /linkedin\.com\/(authwall|login|checkpoint|uas\/login)/i;

// A tier that found job cards and produced no record from any of them has churned
// accessors, not an empty page. Its zero is a starved parser, and passing it off as
// a capture is how a page of real jobs disappears with a green badge.
function starvation(tier: TierExtraction, name: string): string | null {
  if (!tier.recognized || tier.cardCount === 0 || tier.records.length > 0) return null;
  return `${name} found ${tier.cardCount} job cards and extracted none (${tier.droppedCount} dropped: a required id, title or company was missing, or the card itself did not resolve)`;
}

export const linkedInModule: SiteModule = {
  id: "linkedin",
  matches: (url) => CURATED_RE.test(url) || AUTH_RE.test(url),
  detectAuthState,
  extract(ctx: ExtractContext): CapturedRecord[] {
    // Least-detectable first: embedded JSON (isolated world) → rendered DOM.
    const embedded = extractEmbedded(ctx.doc, ctx.url);
    if (embedded.records.length > 0) return embedded.records;
    const dom = extractDom(ctx.doc, ctx.url);
    if (dom.records.length > 0) return dom.records;

    // Nothing captured. Tier 1 reads the collection payload the page hydrated, which
    // is the page's own statement of how many jobs it holds, so its confirmed empty
    // outranks anything tier 2 infers from rendered markup. Tier 2 gets to run first
    // and keep whatever it found, but it does not get to veto that statement: its
    // CARD selector ends in a bare `[data-job-id]`, which also matches the split-view
    // detail pane and the saved-job rails that render beside an empty list, so one
    // stray node would otherwise put a red badge on a page that is simply empty.
    if (embedded.emptyStateConfirmed) return [];

    // Otherwise fail loud if a tier starved: it saw job cards and produced no record
    // from any of them, which is a churned accessor rather than an empty page.
    const starved = [starvation(embedded, "embedded"), starvation(dom, "dom")].filter(
      (s): s is string => s !== null,
    );
    if (starved.length > 0) {
      throw new ExtractorShapeError(`LinkedIn extractor needs update: ${starved.join("; ")}`);
    }

    // No tier found a job card, and none of them confirmed the collection is empty.
    // Recognizing the page shape is not enough to call that a capture: a non-jobs
    // interstitial hydrates model blocks too, and so does a jobs page whose card
    // detection churned. Without a positive empty-state signal we cannot tell those
    // from a page that genuinely holds nothing, so we do not guess.
    throw new ExtractorShapeError();
  },
};
