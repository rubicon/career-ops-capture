import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(__dirname, "..", "scripts", "validate-changelog.mjs");
const PREAMBLE = "# Changelog\n\nAll notable changes are documented here.\n\n";

function run(changelog: string | null) {
  const args = [SCRIPT];
  if (changelog !== null) {
    const dir = mkdtempSync(join(tmpdir(), "changelog-"));
    const file = join(dir, "CHANGELOG.md");
    writeFileSync(file, changelog);
    args.push(file);
  }
  return spawnSync(process.execPath, args, { encoding: "utf-8" });
}

describe("validate-changelog", () => {
  it("fails on a house-format heading, which release-please cannot see", () => {
    const r = run(
      `${PREAMBLE}## Career-Ops Capture v0.1.6 (2026-09-02)\n\nBody.\n\n## [0.1.3](https://example.test/compare/v0.1.2...v0.1.3) (2026-08-15)\n`,
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Career-Ops Capture v0.1.6");
  });

  it("fails on an [Unreleased] heading at the top", () => {
    const r = run(`${PREAMBLE}## [Unreleased]\n\n## [0.1.0] - 2026-07-03\n`);
    expect(r.status).toBe(1);
  });

  it("fails when there is no release heading at all", () => {
    const r = run(`${PREAMBLE}Nothing yet.\n`);
    expect(r.status).toBe(1);
  });

  it("passes a Keep a Changelog heading", () => {
    const r = run(`${PREAMBLE}## [0.1.7] - 2026-10-12\n\n## [0.1.6] - 2026-09-02\n`);
    expect(r.status).toBe(0);
  });

  it("passes a raw release-please heading", () => {
    const r = run(
      `${PREAMBLE}## [0.1.8](https://example.test/compare/v0.1.7...v0.1.8) (2026-10-20)\n`,
    );
    expect(r.status).toBe(0);
  });

  it("passes the repository CHANGELOG.md", () => {
    const r = run(null);
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});
