export interface Signals {
  topApplicant?: boolean;
  matchPercent?: number;
  easyApply?: boolean;
  activelyRecruiting?: boolean;
  recencyDays?: number;
  applicantCount?: number;
}

export interface CapturedRecord {
  url: string;
  company: string;
  role: string;
  location?: string;
  signals: Signals;
  source: string;
  capturedAt: string;
}

// What one extraction tier saw. `recognized` alone cannot say whether an empty
// `records` is a page with no jobs or a tier whose field accessors churned, and
// reporting the second as success loses every job on the page silently. The card
// counts are what let the module tell them apart.
export interface TierExtraction {
  records: CapturedRecord[];
  // The tier understood the page shape: model blocks parsed, or card containers matched.
  recognized: boolean;
  // Job cards the tier saw before reading any field off them.
  cardCount: number;
  // Cards discarded because a required field (id, title, company) came back empty.
  droppedCount: number;
}

export type AuthState = "authed" | "logged-out" | "unknown";

export interface ExtractContext {
  doc: Document;
  url: string;
}

export interface SiteModule {
  id: string;
  matches(url: string): boolean;
  extract(ctx: ExtractContext): CapturedRecord[];
  detectAuthState(ctx: ExtractContext): AuthState;
}
