import { browser } from "../platform/browser";
import { CaptureBuffer } from "../core/buffer";
import { drainBuffer, type DrainResult } from "../core/drain";
import { loadSettings } from "../core/settings";

const storage = () => browser.storage.local as any;

async function refreshBadge(): Promise<void> {
  const count = await new CaptureBuffer(storage()).count();
  await browser.action.setBadgeText({ text: count ? String(count) : "" });
  await browser.action.setBadgeBackgroundColor({ color: "#0a66c2" });
}

// Soft cap: warn (never block) past N captures per hour.
async function recordCaptureCount(added: number): Promise<void> {
  if (added <= 0) return;
  const s = await loadSettings(storage());
  const now = Date.now();
  const got = (await browser.storage.local.get("cap_window")) as any;
  const win = got?.cap_window as { start: number; count: number } | undefined;
  const fresh = !win || now - win.start > 3_600_000;
  const next = fresh
    ? { start: now, count: added }
    : { start: win!.start, count: win!.count + added };
  await browser.storage.local.set({ cap_window: next });
  if (next.count > s.softCapPerHour) {
    await browser.action.setTitle({
      title: `Career-Ops Capture: ${next.count} captures this hour (soft cap ${s.softCapPerHour})`,
    });
  }
}

browser.runtime.onMessage.addListener(async (msg: any) => {
  if (msg?.kind === "capture-result") {
    await browser.storage.local.set({ last_auth: msg.result?.authState ?? "unknown" });
    if (msg.result?.status === "shape-error") {
      await browser.action.setBadgeText({ text: "!" });
      await browser.action.setBadgeBackgroundColor({ color: "#b00020" });
      await browser.action.setTitle({ title: "Career-Ops Capture: extractor needs update" });
      return;
    }
    await recordCaptureCount(msg.result?.added ?? 0);
    await refreshBadge();
  }
  if (msg?.kind === "drain-request") {
    return await drainNow();
  }
});

// No token gate: /api/explore/add has no auth check and the app has no middleware,
// so refusing to send without a token only ever blocked delivery to an endpoint that
// never wanted one. deliver() sends the header when a token is configured.
async function drainNow(): Promise<DrainResult> {
  const s = await loadSettings(storage());
  const buffer = new CaptureBuffer(storage());
  const result = await drainBuffer(buffer, { host: "127.0.0.1", port: s.port, token: s.token }, ((
    u: string,
    i: RequestInit,
  ) => fetch(u, i)) as any);
  await refreshBadge();
  if (result.failed > 0) {
    await browser.action.setTitle({
      title: `Career-Ops Capture: ${result.failed} not delivered${result.error ? ` (${result.error})` : ""}`,
    });
  }
  await browser.alarms.create("retry", { delayInMinutes: 5 }); // retry leftovers later
  return result;
}

browser.alarms.onAlarm.addListener(async (a) => {
  if (a.name === "retry") await drainNow();
});
browser.runtime.onInstalled.addListener(() => refreshBadge());
browser.runtime.onStartup?.addListener?.(() => refreshBadge());
