import { describe, it, expect } from "vitest";
import { loadSettings, saveSettings } from "../src/core/settings";

function memStorage() {
  const mem: Record<string, unknown> = {};
  return {
    async get(k: string) {
      return { [k]: mem[k] };
    },
    async set(o: Record<string, unknown>) {
      Object.assign(mem, o);
    },
  };
}

describe("settings", () => {
  it("defaults: port 3000, tier3 off, linkedin enabled, others present-disabled", async () => {
    const s = await loadSettings(memStorage());
    expect(s.port).toBe(3000);
    expect(s.tier3Enabled).toBe(false);
    expect(s.softCapPerHour).toBe(60);
    const li = s.portals.find((p) => p.id === "linkedin");
    expect(li?.enabled).toBe(true);
    expect(s.portals.some((p) => p.id === "indeed" && !p.enabled)).toBe(true);
    expect(s.portals.some((p) => p.id === "glassdoor" && !p.enabled)).toBe(true);
  });
  it("round-trips saved values", async () => {
    const st = memStorage();
    await saveSettings(st, {
      token: "T",
      port: 9000,
      softCapPerHour: 30,
      tier3Enabled: true,
      portals: [],
    });
    const s = await loadSettings(st);
    expect(s.token).toBe("T");
    expect(s.port).toBe(9000);
    expect(s.tier3Enabled).toBe(true);
  });
});
