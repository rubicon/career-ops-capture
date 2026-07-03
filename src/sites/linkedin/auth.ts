import type { AuthState, ExtractContext } from "../../core/types";

// v1: isolated-world only. A URL redirect to auth/login, or a logged-out DOM
// marker. The Voyager 401 shape is NOT used in v1 (that needs the tier-3
// MAIN-world tap, off by default).
export function detectAuthState(ctx: ExtractContext): AuthState {
  if (/\/(authwall|login|checkpoint|uas\/login)/i.test(ctx.url)) return "logged-out";
  const d = ctx.doc;
  const loggedOutMarker = d.querySelector("form.login__form, .authwall, a[href*='/login']");
  const memberChrome = d.querySelector("nav .global-nav__me, img.global-nav__me-photo");
  if (loggedOutMarker && !memberChrome) return "logged-out";
  if (d.querySelector(".global-nav__me, .scaffold-layout, [data-job-id], code#bpr-guid-1")) {
    return "authed";
  }
  return "unknown";
}
