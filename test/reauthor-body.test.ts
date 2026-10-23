import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(__dirname, "..", "scripts", "reauthor-body.mjs");

const RELEASE_BODY = [
  ":robot: I have created a release *beep* *boop*",
  "---",
  "",
  "",
  "## [0.1.9](https://github.com/rubicon/career-ops-capture/compare/v0.1.8...v0.1.9) (2026-10-21)",
  "",
  "### Fixed",
  "",
  "* something",
  "",
  "---",
  "This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).",
].join("\n");

function run(pr: { author: string; body: string | null }) {
  const dir = mkdtempSync(join(tmpdir(), "reauthor-"));
  const file = join(dir, "source-pr.json");
  writeFileSync(file, JSON.stringify({ author: { login: pr.author }, body: pr.body }));
  return spawnSync(process.execPath, [SCRIPT, file, "96"], { encoding: "utf-8" });
}

// A port of release-please's splitBody (src/util/pull-request-body.ts), which is what
// decides whether a merged PR is recognized as a release PR.
function split(body: string) {
  const lines = body.trim().replace(/\r\n/g, "\n").split("\n");
  const index = lines.indexOf("---");
  if (index === -1) return undefined;
  let last = lines.lastIndexOf("---");
  if (last === index) last = lines.length - 1;
  return {
    content: lines.slice(index + 1, last).join("\n"),
    footer: lines.slice(last + 1).join("\n"),
  };
}

describe("reauthor-body", () => {
  it("keeps a release-please body and appends the reauthor note", () => {
    const r = run({ author: "rubicon-release-please[bot]", body: RELEASE_BODY });
    expect(r.status).toBe(0);
    expect(r.stdout.startsWith(RELEASE_BODY)).toBe(true);
    expect(r.stdout).toContain("Reauthored copy of #96");
  });

  it("leaves the notes block release-please parses unchanged", () => {
    const r = run({ author: "rubicon-release-please[bot]", body: RELEASE_BODY });
    expect(split(r.stdout)?.content).toBe(split(RELEASE_BODY)?.content);
  });

  it("adds no delimiter line that would move release-please's notes boundary", () => {
    const r = run({ author: "rubicon-release-please[bot]", body: RELEASE_BODY });
    const added = r.stdout.slice(RELEASE_BODY.length);
    expect(added.split("\n")).not.toContain("---");
  });

  it("fails loudly when a release-please body carries no delimiter", () => {
    const r = run({ author: "rubicon-release-please[bot]", body: "hand written" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("release-please");
  });

  it("writes the plain reauthor note for a dependabot PR and drops its body", () => {
    const r = run({ author: "dependabot[bot]", body: "Bumps foo from 1 to 2." });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Reauthored copy of #96");
    expect(r.stdout).not.toContain("Bumps foo");
  });
});
