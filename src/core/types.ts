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
