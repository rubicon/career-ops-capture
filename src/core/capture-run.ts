import type { AuthState, SiteModule } from "./types";
import type { CaptureBuffer } from "./buffer";
import { ExtractorShapeError } from "../sites/linkedin/index";

export interface CaptureResult {
  status: "captured" | "logged-out" | "no-module" | "shape-error";
  added: number;
  authState: AuthState;
}

// Pure orchestration: find the site module, gate on auth, extract, buffer. The
// site lookup is injected so this is unit-testable without the browser registry.
export async function runCapture(
  doc: Document,
  url: string,
  buffer: CaptureBuffer,
  find: (url: string) => SiteModule | undefined,
): Promise<CaptureResult> {
  const site = find(url);
  if (!site) return { status: "no-module", added: 0, authState: "unknown" };
  const ctx = { doc, url };
  const authState = site.detectAuthState(ctx);
  if (authState === "logged-out") return { status: "logged-out", added: 0, authState };
  try {
    const records = site.extract(ctx);
    const added = await buffer.add(records);
    return { status: "captured", added, authState: authState === "unknown" ? "authed" : authState };
  } catch (e) {
    if (e instanceof ExtractorShapeError) return { status: "shape-error", added: 0, authState };
    throw e;
  }
}
