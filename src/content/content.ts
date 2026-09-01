import { browser } from "../platform/browser";
import { CaptureBuffer } from "../core/buffer";
import { findSite, registerSite } from "../core/registry";
import { linkedInModule } from "../sites/linkedin/index";
import { runCapture } from "../core/capture-run";
import { nextCaptureKey } from "../core/nav";
import { loadSettings } from "../core/settings";
import { parseTappedPayload } from "./inject-parse";

registerSite(linkedInModule);

// Tier-3 (MAIN-world fetch tap) bridge, populated only when tier-3 is enabled.
// Off by default; the only code that touches the page runtime.
let tapped: any | null = null;
window.addEventListener("message", (e) => {
  if (e.source !== window || !(e.data && (e.data as any).__coCapture)) return;
  const p = parseTappedPayload(e.data as any);
  if (p) tapped = p;
});

let tier3Injected = false;

async function maybeInjectTier3(): Promise<void> {
  if (tier3Injected) return;
  const s = await loadSettings(browser.storage.local as any);
  if (!s.tier3Enabled) return;
  tier3Injected = true;
  const el = document.createElement("script");
  el.src = browser.runtime.getURL("content/inject.js");
  (document.head || document.documentElement).appendChild(el);
  el.remove();
}

async function capture(): Promise<void> {
  await maybeInjectTier3();
  const buffer = new CaptureBuffer(browser.storage.local as any);
  const result = await runCapture(document, location.href, buffer, findSite);
  // last-resort tier-3 fallback would consume `tapped` here; kept minimal + gated.
  void tapped;
  await browser.runtime.sendMessage({ kind: "capture-result", result }).catch(() => {});
}

// The last page we extracted, so an in-app navigation that only reselects a card
// does not re-extract the same list. Set on the first run, whether or not the page
// is one we capture.
let lastKey: string | null = null;
const supported = (url: string) => findSite(url) !== undefined;

async function captureIfNew(): Promise<void> {
  const key = nextCaptureKey(lastKey, location.href, supported);
  if (key === null) return;
  lastKey = key;
  await capture();
}

// Quiet period after the last DOM change before a soft navigation is considered
// rendered, and the longest we will wait for that quiet. On a soft navigation the
// url changes before the new list exists, and extracting an empty page throws
// ExtractorShapeError and paints the red badge, so the capture waits for the page
// the same way the load event made it wait on a hard navigation. The cap is there
// because a surface that never goes quiet would otherwise never capture at all.
const SETTLE_MS = 1000;
const MAX_WAIT_MS = 8000;
let settle: ReturnType<typeof setTimeout> | undefined;
let deadline = 0;

function onPageChanged(): void {
  // Cheap key compare first: on a page already captured this is all that runs, for
  // every batch of LinkedIn's own DOM churn.
  if (nextCaptureKey(lastKey, location.href, supported) === null) return;
  const now = Date.now();
  if (deadline === 0) deadline = now + MAX_WAIT_MS;
  clearTimeout(settle);
  settle = setTimeout(
    () => {
      deadline = 0;
      void captureIfNew();
    },
    Math.max(0, Math.min(SETTLE_MS, deadline - now)),
  );
}

// Passive: run once when the curated page has settled, then again when the page
// navigates itself somewhere we capture. LinkedIn is a single-page app, so an
// in-app click rewrites the url with history.pushState and fires no load event,
// and a content script in the isolated world cannot hear the page's own history
// calls. The DOM the page rewrites is the signal we do get. No scrolling, no
// clicks, no navigation, no polling: this observer only reads location.href, and
// it holds no timer except while a navigation we care about is settling.
// Extraction only fills the local buffer.
function start(): void {
  lastKey = nextCaptureKey(null, location.href, supported);
  void capture();
  new MutationObserver(onPageChanged).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "complete") start();
else window.addEventListener("load", start, { once: true });
