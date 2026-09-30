import { describe, it, expect } from "vitest";
import { surfaceLabels, sourceFor } from "../src/sites/linkedin/surfaces";
import { linkedInModule } from "../src/sites/linkedin/index";

// Issue #109: the options page used to render a hand-maintained copy of this list
// from stored settings, and it fell two surfaces behind without anything noticing.
// These tie the displayed labels to the one table that decides them.
describe("surface labels", () => {
  it("are every label the route table can produce", () => {
    expect(surfaceLabels()).toEqual([
      "linkedin-topapplicant",
      "linkedin-recommended",
      "linkedin-search",
    ]);
  });
  it("are what the module advertises", () => {
    expect(linkedInModule.surfaces).toEqual(surfaceLabels());
  });
  it("are the same strings a captured record carries", () => {
    const fromRoutes = [
      "https://www.linkedin.com/jobs/collections/top-applicant/",
      "https://www.linkedin.com/jobs/collections/recommended/",
      "https://www.linkedin.com/jobs/search-results/?keywords=x",
    ].map(sourceFor);
    expect(fromRoutes).toEqual(surfaceLabels());
  });
});
