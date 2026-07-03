import { browser } from "../platform/browser";
import { CaptureBuffer } from "../core/buffer";
import { drainBuffer } from "../core/drain";
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
    await drainNow();
  }
});

async function drainNow(): Promise<void> {
  const s = await loadSettings(storage());
  if (!s.token) {
    await browser.action.setTitle({ title: "Career-Ops Capture: set token in options" });
    return;
  }
  const buffer = new CaptureBuffer(storage());
  await drainBuffer(buffer, { host: "127.0.0.1", port: s.port, token: s.token }, ((
    u: string,
    i: RequestInit,
  ) => fetch(u, i)) as any);
  await refreshBadge();
  await browser.alarms.create("retry", { delayInMinutes: 5 }); // retry leftovers later
}

browser.alarms.onAlarm.addListener(async (a) => {
  if (a.name === "retry") await drainNow();
});
browser.runtime.onInstalled.addListener(() => refreshBadge());
browser.runtime.onStartup?.addListener?.(() => refreshBadge());
