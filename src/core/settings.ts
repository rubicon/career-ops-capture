import type { StorageArea } from "./buffer";

export interface PortalSetting {
  id: string;
  enabled: boolean;
  surfaces: string[];
}
export interface Settings {
  token: string;
  port: number;
  softCapPerHour: number;
  tier3Enabled: boolean;
  portals: PortalSetting[];
}

const KEY = "settings";

export function defaultSettings(): Settings {
  return {
    // port 3000 = career-ops dev default; verify against your running app.
    token: "",
    port: 3000,
    softCapPerHour: 60,
    tier3Enabled: false,
    // Multi-portal from day one; LinkedIn is the only live module in v1.
    portals: [
      { id: "linkedin", enabled: true, surfaces: ["top-applicant", "recommended"] },
      { id: "indeed", enabled: false, surfaces: [] },
      { id: "glassdoor", enabled: false, surfaces: [] },
    ],
  };
}

export async function loadSettings(storage: StorageArea): Promise<Settings> {
  const got = await storage.get(KEY);
  const saved = got[KEY] as Partial<Settings> | undefined;
  return {
    ...defaultSettings(),
    ...(saved ?? {}),
    portals: saved?.portals ?? defaultSettings().portals,
  };
}

export async function saveSettings(storage: StorageArea, s: Settings): Promise<void> {
  await storage.set({ [KEY]: s });
}
