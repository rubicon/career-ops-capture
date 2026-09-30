import { describe, it, expect, beforeEach } from "vitest";
import { registerSite, findSite, siteById, _resetRegistry } from "../src/core/registry";
import type { SiteModule } from "../src/core/types";

const fake: SiteModule = {
  id: "x",
  surfaces: ["x-one"],
  matches: (u) => u.includes("example.com"),
  extract: () => [],
  detectAuthState: () => "unknown",
};

describe("registry", () => {
  beforeEach(() => _resetRegistry());
  it("finds by url", () => {
    registerSite(fake);
    expect(findSite("https://example.com/a")?.id).toBe("x");
  });
  it("undefined when no match", () => {
    registerSite(fake);
    expect(findSite("https://other.com")).toBeUndefined();
  });
  it("finds by id, so a ui can read a module's own metadata", () => {
    registerSite(fake);
    expect(siteById("x")).toBe(fake);
    expect(siteById("nope")).toBeUndefined();
  });
});
