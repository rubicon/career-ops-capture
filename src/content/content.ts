import { browser } from "../platform/browser";
import { CaptureBuffer } from "../core/buffer";
import { findSite, registerSite } from "../core/registry";
import { linkedInModule } from "../sites/linkedin/index";
import { runCapture } from "../core/capture-run";
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

async function maybeInjectTier3(): Promise<void> {
  const s = await loadSettings(browser.storage.local as any);
  if (!s.tier3Enabled) return;
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

// Passive: run once when the curated page has settled. No scrolling, no clicks,
// no navigation, no polling. Extraction only fills the local buffer.
if (document.readyState === "complete") void capture();
else window.addEventListener("load", () => void capture(), { once: true });
