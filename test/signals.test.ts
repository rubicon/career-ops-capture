import { describe, it, expect } from "vitest";
import { derivePrio, deriveNote, deriveSig } from "../src/core/signals";

describe("derivePrio", () => {
  it("A when Top Applicant", () =>
    expect(derivePrio({ topApplicant: true, matchPercent: 40 })).toBe("A"));
  it("B when match >= 85 and not Top Applicant", () =>
    expect(derivePrio({ matchPercent: 90 })).toBe("B"));
  it("C otherwise", () => expect(derivePrio({ matchPercent: 50 })).toBe("C"));
  it("C on empty signals", () => expect(derivePrio({})).toBe("C"));
});

describe("deriveNote", () => {
  it("human readable", () =>
    expect(deriveNote({ topApplicant: true, matchPercent: 92 })).toBe("Top Applicant, 92% match"));
  it("empty signals → empty note", () => expect(deriveNote({})).toBe(""));
});

describe("deriveSig", () => {
  it("machine tag with prio", () =>
    expect(
      deriveSig({ topApplicant: true, matchPercent: 92, easyApply: true }, "linkedin-topapplicant"),
    ).toBe("source=linkedin-topapplicant top_applicant=1 match=92 easy_apply=1 prio=A"));
  it("always includes source and prio", () =>
    expect(deriveSig({}, "linkedin")).toBe("source=linkedin prio=C"));
});
