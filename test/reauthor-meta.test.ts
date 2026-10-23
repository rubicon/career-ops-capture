import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(__dirname, "..", "scripts", "reauthor-meta.mjs");

interface Source {
  author: string;
  headRefName: string;
  labels: string[];
}

function run(pr: Source) {
  const dir = mkdtempSync(join(tmpdir(), "reauthor-"));
  const file = join(dir, "source-pr.json");
  writeFileSync(
    file,
    JSON.stringify({
      author: { login: pr.author },
      headRefName: pr.headRefName,
      labels: pr.labels.map((name) => ({ name })),
    }),
  );
  return spawnSync(process.execPath, [SCRIPT, file, "96"], { encoding: "utf-8" });
}

// Ports of the branch patterns in release-please v17.6.0 (src/util/branch-name.ts),
// the version pinned through googleapis/release-please-action v5.0.0. A merged PR
// whose head branch matches none of them is skipped ("Bad branch name").
const PATTERNS = [
  /^release-?(?<component>[\w-.]*)?-v(?<version>[0-9].*)$/,
  /^release-please--branches--(?<branch>.+)--components--(?<component>.+)$/,
  /^release-please--branches--(?<branch>.+)--groups--(?<group>.+)$/,
  /^release-please--branches--(?<branch>.+)$/,
];
const recognized = (b: string) => PATTERNS.some((p) => p.test(b));
const isComponent = (b: string) => PATTERNS[1]!.test(b);

describe("reauthor-meta", () => {
  const rp = {
    author: "rubicon-release-please[bot]",
    headRefName: "release-please--branches--main",
    labels: ["autorelease: pending"],
  };

  it("gives a release-please source a branch release-please recognizes", () => {
    const meta = JSON.parse(run(rp).stdout);
    expect(meta.branch).toBe("release-please--branches--main--reauthor-pr-96");
    expect(recognized(meta.branch)).toBe(true);
    expect(isComponent(meta.branch)).toBe(false);
  });

  it("copies the autorelease labels and no others", () => {
    const meta = JSON.parse(
      run({ ...rp, labels: ["autorelease: pending", "dependencies", "autorelease: snooze"] })
        .stdout,
    );
    expect(meta.labels).toEqual(["autorelease: pending", "autorelease: snooze"]);
  });

  it("refuses a release-please source whose branch is not the plain default shape", () => {
    for (const headRefName of [
      "chore/something",
      "release-please--branches--main--components--x",
      "release-please--branches--main--groups--g",
    ]) {
      const r = run({ ...rp, headRefName });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain(headRefName);
    }
  });

  it("keeps the plain branch and no labels for a dependabot source", () => {
    const meta = JSON.parse(
      run({
        author: "dependabot[bot]",
        headRefName: "dependabot/npm_and_yarn/foo-2",
        labels: ["dependencies"],
      }).stdout,
    );
    expect(meta).toEqual({ branch: "chore/reauthor-pr-96", labels: [] });
  });
});
