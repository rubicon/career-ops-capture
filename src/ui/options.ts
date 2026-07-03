import { browser } from "../platform/browser";
import { loadSettings, saveSettings, type Settings } from "../core/settings";

const storage = () => browser.storage.local as any;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function render(): Promise<void> {
  const s = await loadSettings(storage());
  ($("token") as HTMLInputElement).value = s.token;
  ($("port") as HTMLInputElement).value = String(s.port);
  ($("cap") as HTMLInputElement).value = String(s.softCapPerHour);
  ($("tier3") as HTMLInputElement).checked = s.tier3Enabled;
  const box = $("portals");
  box.replaceChildren();
  for (const p of s.portals) {
    const live = p.id === "linkedin";
    const row = document.createElement("div");
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.portal = p.id;
    cb.checked = p.enabled;
    cb.disabled = !live;
    label.append(cb, " ", p.id);
    if (live && p.surfaces.length) {
      const surfaces = document.createElement("span");
      surfaces.style.color = "#888";
      surfaces.textContent = ` (${p.surfaces.join(", ")})`;
      label.append(surfaces);
    } else if (!live) {
      label.append(" (coming soon)");
    }
    row.append(label);
    box.append(row);
  }
}

async function save(): Promise<void> {
  const cur = await loadSettings(storage());
  const next: Settings = {
    token: ($("token") as HTMLInputElement).value.trim(),
    port: Number(($("port") as HTMLInputElement).value) || 3000,
    softCapPerHour: Number(($("cap") as HTMLInputElement).value) || 60,
    tier3Enabled: ($("tier3") as HTMLInputElement).checked,
    portals: cur.portals.map((p) => ({
      ...p,
      enabled:
        (document.querySelector(`input[data-portal="${p.id}"]`) as HTMLInputElement | null)
          ?.checked ?? p.enabled,
    })),
  };
  await saveSettings(storage(), next);
  $("status").textContent = "saved";
}

$("save").addEventListener("click", () => void save());
void render();
