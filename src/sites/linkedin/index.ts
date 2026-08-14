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

const CURATED_RE = /linkedin\.com\/jobs\/collections\/(top-applicant|recommended)/i;
// Also claim LinkedIn's auth surfaces: a passive open of a curated URL can redirect
// to a login wall. Claiming these lets detectAuthState() report
// logged-out and drive the re-auth prompt instead of silently no-module'ing.
const AUTH_RE = /linkedin\.com\/(authwall|login|checkpoint|uas\/login)/i;

// A tier that found job cards and produced no record from any of them has churned
// accessors, not an empty page. Its zero is a starved parser, and passing it off as
// a capture is how a page of real jobs disappears with a green badge.
function starvation(tier: TierExtraction, name: string): string | null {
  if (!tier.recognized || tier.cardCount === 0 || tier.records.length > 0) return null;
  return `${name} found ${tier.cardCount} job cards and extracted none (${tier.droppedCount} dropped for a missing id, title or company)`;
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

    // Nothing captured. Fail loud if either tier starved, even when the other tier
    // is content, because the starved one is the tier that saw the jobs.
    const starved = [starvation(embedded, "embedded"), starvation(dom, "dom")].filter(
      (s): s is string => s !== null,
    );
    if (starved.length > 0) {
      throw new ExtractorShapeError(`LinkedIn extractor needs update: ${starved.join("; ")}`);
    }

    // Otherwise a tier read the page and found no job cards to begin with, on a URL
    // that only matches a curated jobs collection: the one empty result that is
    // genuinely empty. It stays ambiguous with a churn of the card *detectors*
    // themselves (`isJobCard` and CARD both), which needs a positive empty-state
    // signal to separate, and that has to come from a real capture.
    if (embedded.recognized || dom.recognized) return [];
    throw new ExtractorShapeError();
  },
};
