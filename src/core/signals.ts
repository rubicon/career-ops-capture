import type { Signals } from "./types";

// prio drives downstream ordering only; it never affects scoring.
// A = Top Applicant; B = strong match (>= 85) without Top Applicant; else C.
export function derivePrio(s: Signals): "A" | "B" | "C" {
  if (s.topApplicant) return "A";
  if (typeof s.matchPercent === "number" && s.matchPercent >= 85) return "B";
  return "C";
}

// Human-readable note surfaced when triaging captured leads.
export function deriveNote(s: Signals): string {
  const parts: string[] = [];
  if (s.topApplicant) parts.push("Top Applicant");
  if (typeof s.matchPercent === "number") parts.push(`${s.matchPercent}% match`);
  if (s.easyApply) parts.push("Easy Apply");
  if (s.activelyRecruiting) parts.push("actively recruiting");
  return parts.join(", ");
}

// Compact machine tag for downstream sorting; always carries source + prio.
export function deriveSig(s: Signals, source: string): string {
  const kv: string[] = [`source=${source}`];
  if (s.topApplicant) kv.push("top_applicant=1");
  if (typeof s.matchPercent === "number") kv.push(`match=${s.matchPercent}`);
  if (s.easyApply) kv.push("easy_apply=1");
  if (s.activelyRecruiting) kv.push("actively_recruiting=1");
  if (typeof s.recencyDays === "number") kv.push(`recency=${s.recencyDays}d`);
  if (typeof s.applicantCount === "number") kv.push(`applicants=${s.applicantCount}`);
  kv.push(`prio=${derivePrio(s)}`);
  return kv.join(" ");
}
