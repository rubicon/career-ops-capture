#!/usr/bin/env node
// Guards the changelog heading shape. release-please inserts each new entry
// above the first heading matching /\n###? v?[0-9[]/. If the first "## "
// heading does not start with a version number, every new release lands below
// it and out of order (issue #98). The adopted Keep a Changelog form
// "## [x.y.z] - YYYY-MM-DD" and release-please's raw form both pass. Runs in CI.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] ?? join(ROOT, "CHANGELOG.md");
const text = readFileSync(file, "utf-8");

const first = text.split("\n").find((line) => line.startsWith("## "));

if (first === undefined) {
  console.error(`${file}: no "## " release heading found`);
  process.exit(1);
}
if (!/^## \[[0-9]/.test(first)) {
  console.error(
    `${file}: first release heading is not "## [x.y.z]": ${first}\n` +
      "release-please would insert new entries below it. Use the Keep a Changelog\n" +
      'form "## [x.y.z] - YYYY-MM-DD" (see issue #98).',
  );
  process.exit(1);
}
console.log(`validate-changelog: ok (${first})`);
