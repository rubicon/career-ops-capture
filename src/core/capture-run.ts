import type { AuthState, SiteModule } from "./types";
import type { CaptureBuffer } from "./buffer";
import { ExtractorShapeError } from "../sites/linkedin/index";

export interface CaptureResult {
  status: "captured" | "logged-out" | "no-module" | "shape-error" | "portal-disabled";
  added: number;
  authState: AuthState;
}

// Pure orchestration: find the site module, gate on auth, gate on the portal, extract,
// buffer. The site lookup and the portal gate are both injected so this is unit-testable
// without the browser registry or storage.
//
// The portal gate is deliberately after the auth check. Disabling a portal turns off
// capture, not session awareness: an authwall still reports logged-out so the popup can
// offer its re-login button, which is the one thing a user with a disabled portal still
// needs to know. It is also before `extract`, so a disabled portal cannot paint the
// fail-loud shape-error badge for a page it was never going to read.
export async function runCapture(
  doc: Document,
  url: string,
  buffer: CaptureBuffer,
  find: (url: string) => SiteModule | undefined,
  isPortalEnabled: (id: string) => boolean,
): Promise<CaptureResult> {
  const site = find(url);
  if (!site) return { status: "no-module", added: 0, authState: "unknown" };
  const ctx = { doc, url };
  const authState = site.detectAuthState(ctx);
  if (authState === "logged-out") return { status: "logged-out", added: 0, authState };
  if (!isPortalEnabled(site.id)) return { status: "portal-disabled", added: 0, authState };
  try {
    const records = site.extract(ctx);
    const added = await buffer.add(records);
    return { status: "captured", added, authState: authState === "unknown" ? "authed" : authState };
  } catch (e) {
    if (e instanceof ExtractorShapeError) return { status: "shape-error", added: 0, authState };
    throw e;
  }
}
