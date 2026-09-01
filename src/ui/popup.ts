import { browser } from "../platform/browser";
import { CaptureBuffer } from "../core/buffer";
import { describeDrain, type DrainResult } from "../core/drain";

const $ = (id: string) => document.getElementById(id)!;
const storage = () => browser.storage.local as any;

async function refresh(): Promise<void> {
  const n = await new CaptureBuffer(storage()).count();
  $("count").textContent = `${n} buffered`;
}

$("send").addEventListener("click", async () => {
  $("msg").textContent = "sending...";
  // Await the drain and report its result. Announcing "sent" on click reported
  // success for sends that delivered nothing, or never left the extension at all.
  const result = await browser.runtime.sendMessage({ kind: "drain-request" }).catch(() => null);
  await refresh();
  $("msg").textContent = describeDrain(result as DrainResult | null);
});

$("relogin").addEventListener("click", async () => {
  await browser.tabs.create({ url: "https://www.linkedin.com/login" });
});

$("opts").addEventListener("click", (e) => {
  e.preventDefault();
  void browser.runtime.openOptionsPage();
});

// Show the re-login button if the last capture-result was logged-out.
browser.storage.local.get("last_auth").then((r: any) => {
  if (r?.last_auth === "logged-out") ($("relogin") as HTMLElement).style.display = "block";
});

void refresh();
