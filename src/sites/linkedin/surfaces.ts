// The curated surfaces this module claims, and the label a record from each one
// carries. Both live here on purpose: issue #69 was a route that drifted while
// the label had no way to notice, and the two are only ever right together.
//
// One ordered table, read by both functions below, so a surface cannot be added
// to the route match without also being given a label.
const SURFACES: ReadonlyArray<readonly [RegExp, string]> = [
  [/linkedin\.com\/jobs\/collections\/top-applicant/i, "linkedin-topapplicant"],
  [/linkedin\.com\/jobs\/collections\/recommended/i, "linkedin-recommended"],
  // Any job search the user runs themselves is a curated surface for our purposes,
  // not only the qualification-landing entry point the top-applicant module links to.
  [/linkedin\.com\/jobs\/search-results/i, "linkedin-search"],
];

export function isCurated(url: string): boolean {
  return SURFACES.some(([re]) => re.test(url));
}

// Provenance is read off the page, never assumed. A keyword search and a
// recommended-for-you listing are not top-applicant results and must not claim to
// be, and an unrecognized url falls through to the bare `linkedin` label rather
// than inheriting a claim it has not earned.
export function sourceFor(url: string): string {
  return SURFACES.find(([re]) => re.test(url))?.[1] ?? "linkedin";
}
