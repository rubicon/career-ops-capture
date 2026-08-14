import type { CapturedRecord, Signals, TierExtraction } from "../../core/types";

const SOURCE = "linkedin-topapplicant";

// Collect every embedded model object LinkedIn hydrates from hidden <code> blocks.
// Voyager collection payloads carry an `included` array of typed entities.
function readEmbeddedModels(doc: Document): any[] {
  const out: any[] = [];
  for (const el of Array.from(doc.querySelectorAll("code"))) {
    const text = el.textContent?.trim();
    if (!text || text[0] !== "{") continue;
    try {
      const obj = JSON.parse(text);
      if (Array.isArray(obj?.included)) out.push(...obj.included);
    } catch {
      /* not a model block */
    }
  }
  return out;
}

// --- churn-isolated accessors: confirm these paths against a real fixture ---
function isJobCard(e: any): boolean {
  const t: string = e?.$type ?? "";
  return typeof t === "string" && t.toLowerCase().includes("jobposting");
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

export function extractEmbedded(doc: Document, _url: string): TierExtraction {
  const models = readEmbeddedModels(doc);
  // No model blocks parsed at all, so this tier has nothing to say about the page.
  if (models.length === 0) return { records: [], recognized: false, cardCount: 0, droppedCount: 0 };
  const cards = models.filter(isJobCard);
  const records: CapturedRecord[] = [];
  const seen = new Set<string>();
  let droppedCount = 0;
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
    if (seen.has(url)) continue;
    seen.add(url);
    records.push({
      url,
      company,
      role: title,
      location: pickLocation(e) || undefined,
      signals: signalsFromInsight(pickInsightText(e)),
      source: SOURCE,
      capturedAt: new Date().toISOString(),
    });
  }
  // "recognized" = the model blocks parsed, so this tier read the page. It is
  // deliberately not "cards.length > 0": a curated collection can legitimately
  // hold no jobs, and that is a clean empty capture rather than an unread page.
  // Whether zero records here is legitimate is the module's call, off the counts.
  return { records, recognized: true, cardCount: cards.length, droppedCount };
}
