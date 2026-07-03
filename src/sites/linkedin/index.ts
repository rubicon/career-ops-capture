import type { CapturedRecord, ExtractContext, SiteModule } from "../../core/types";
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

export const linkedInModule: SiteModule = {
  id: "linkedin",
  matches: (url) => CURATED_RE.test(url) || AUTH_RE.test(url),
  detectAuthState,
  extract(ctx: ExtractContext): CapturedRecord[] {
    // Least-detectable first: embedded JSON (isolated world) → rendered DOM.
    const embedded = extractEmbedded(ctx.doc, ctx.url);
    if (embedded.recognized) return embedded.records;
    const dom = extractDom(ctx.doc, ctx.url);
    if (dom.recognized) return dom.records;
    throw new ExtractorShapeError();
  },
};
