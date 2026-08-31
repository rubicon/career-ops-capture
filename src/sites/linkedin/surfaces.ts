// The curated surfaces this module claims, and the label a record from each one
// carries. Both live here on purpose: issue #69 was a route that drifted while
// the label had no way to notice, and the two are only ever right together.

const COLLECTION_RE = /linkedin\.com\/jobs\/collections\/(top-applicant|recommended)/i;
// Any job search the user runs themselves is a curated surface for our purposes,
// not only the qualification-landing entry point the top-applicant module links to.
const SEARCH_RE = /linkedin\.com\/jobs\/search-results/i;

export function isCurated(url: string): boolean {
  return COLLECTION_RE.test(url) || SEARCH_RE.test(url);
}

// Provenance is read off the page, never assumed. A keyword search is not a
// top-applicant surface and must not claim to be, and a surface added later
// falls through to the bare `linkedin` label rather than inheriting a claim it
// has not earned.
export function sourceFor(url: string): string {
  if (SEARCH_RE.test(url)) return "linkedin-search";
  if (COLLECTION_RE.test(url)) return "linkedin-topapplicant";
  return "linkedin";
}
