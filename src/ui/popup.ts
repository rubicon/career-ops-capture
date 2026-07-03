import { browser } from "../platform/browser";
import { CaptureBuffer } from "../core/buffer";

const $ = (id: string) => document.getElementById(id)!;
const storage = () => browser.storage.local as any;

async function refresh(): Promise<void> {
  const n = await new CaptureBuffer(storage()).count();
  $("count").textContent = `${n} buffered`;
}

$("send").addEventListener("click", async () => {
  $("msg").textContent = "sending...";
  await browser.runtime.sendMessage({ kind: "drain-request" }).catch(() => {});
  setTimeout(() => void refresh(), 600);
  $("msg").textContent = "sent (check badge)";
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
