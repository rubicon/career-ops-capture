// Query params LinkedIn rewrites as you move between cards inside one results
// list. They name the card in the detail pane and the click that opened it, not
// the list a capture reads, so a change confined to them is not a new page.
//
// Verified against a live logged-in session on 2026-08-31 by recording
// location.href through a patched history.pushState while clicking cards:
//
//   /jobs/collections/recommended/  five card selections, every url was
//   ?currentJobId=<id> and nothing else.
//
//   /jobs/search-results/?keywords=...  three card selections, each url carried
//   currentJobId, eBP, refId and trackingId beside the stable keywords.
//   currentJobId, trackingId and eBP changed per card. refId was absent on the
//   first load and present from the first click on, identifying the search
//   rather than the card, so it has to be dropped either way.
//
// Pagination is `start` (clicking Page 2 gave ?keywords=...&start=25), which is
// a different list and stays significant. No `pageNum` or `position` appeared in
// any url, so neither is listed here: `pageNum` in particular reads like
// pagination, and stripping it would silently swallow a real page. `trk` is
// listed on weaker evidence, seen on the card anchor hrefs and on entry links
// rather than in a rewrite, and dropping it only collapses two entry points into
// the same list.
//
// The list stays narrow on purpose: an unknown param counts as significant, which
// costs at most one extra extraction (the buffer dedupes by job url) instead of a
// silently missed page. If LinkedIn introduces another per-card param, the symptom
// is a repeated capture on card clicks, and the fix is one more entry here.
const PER_CARD_PARAMS = ["currentJobId", "eBP", "refId", "trackingId", "trk"];

// Identity of the page as far as capture is concerned: two urls with the same key
// hold the same job list, so extracting the second one again would add nothing.
export function captureKey(url: string): string {
  const u = new URL(url);
  const params = u.searchParams;
  for (const p of PER_CARD_PARAMS) params.delete(p);
  params.sort();
  const query = params.toString();
  return `${u.origin}${u.pathname.replace(/\/+$/, "")}${query ? `?${query}` : ""}`;
}

// Whether a url warrants a capture, given the key of the last one. Returns the new
// key to remember, or null to leave the previous key standing. Pure: the site
// lookup is injected, the caller owns the key. Navigating to an unsupported page
// keeps the previous key, so bouncing out to the feed and back does not re-extract
// a list already in the buffer.
export function nextCaptureKey(
  prevKey: string | null,
  url: string,
  isSupported: (url: string) => boolean,
): string | null {
  if (!isSupported(url)) return null;
  const key = captureKey(url);
  return key === prevKey ? null : key;
}
