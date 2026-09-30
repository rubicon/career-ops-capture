import type { SiteModule } from "./types";

let modules: SiteModule[] = [];

export function registerSite(m: SiteModule): void {
  modules.push(m);
}

export function findSite(url: string): SiteModule | undefined {
  return modules.find((m) => m.matches(url));
}

// For a UI that has a portal id and wants that module's own metadata.
export function siteById(id: string): SiteModule | undefined {
  return modules.find((m) => m.id === id);
}

export function _resetRegistry(): void {
  modules = [];
}
