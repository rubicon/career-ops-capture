// Query params LinkedIn rewrites as you move between cards inside one results
// list. They name the card in the detail pane and the click that opened it, not
// the list a capture reads, so a change confined to them is not a new page.
// The list stays narrow on purpose: an unknown param counts as significant, which
// costs at most one extra extraction (the buffer dedupes by job url) instead of a
// silently missed page. If LinkedIn introduces another per-card param, the symptom
// is a repeated capture on card clicks, and the fix is one more entry here.
const PER_CARD_PARAMS = [
  "currentJobId",
  "refId",
  "trackingId",
  "eBP",
  "trk",
  "position",
  "pageNum",
];

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
