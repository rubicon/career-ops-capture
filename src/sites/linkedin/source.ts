// The `source` label a captured record carries. It names the surface the record
// came from, and the receiving app reads it, so it has to be true of the page:
// a keyword search is not a top-applicant collection, and labeling one as the
// other invents a curation signal the page never made.
const SEARCH_RE = /linkedin\.com\/jobs\/search-results/i;

export function sourceFor(url: string): string {
  return SEARCH_RE.test(url) ? "linkedin-search" : "linkedin-topapplicant";
}
