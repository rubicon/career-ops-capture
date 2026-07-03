// Pure validator for a MAIN-world-tapped payload. Only same-origin LinkedIn
// Voyager job responses with an `included` array are accepted. Used by the
// content script (tier-3 bridge, off by default).
export function parseTappedPayload(m: { origin: string; url: string; body: string }): any | null {
  if (m.origin !== "https://www.linkedin.com") return null;
  if (!/voyager.*(job|Job)/.test(m.url)) return null;
  try {
    const j = JSON.parse(m.body);
    return Array.isArray(j?.included) ? j : null;
  } catch {
    return null;
  }
}
