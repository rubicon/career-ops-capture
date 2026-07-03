import type { SiteModule } from "./types";

let modules: SiteModule[] = [];

export function registerSite(m: SiteModule): void {
  modules.push(m);
}

export function findSite(url: string): SiteModule | undefined {
  return modules.find((m) => m.matches(url));
}

export function _resetRegistry(): void {
  modules = [];
}
