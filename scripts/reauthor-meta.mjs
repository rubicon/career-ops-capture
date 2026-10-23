// Decides the branch name and labels of a reauthored PR (see
// .github/workflows/reauthor-bot-pr.yaml) and prints them as JSON.
// Usage: node scripts/reauthor-meta.mjs <source-pr.json> <pr-number>
//
// release-please only recognizes a merged release PR that carries its pending label
// and whose head branch matches one of its branch patterns (release-please v17.6.0,
// the version pinned through release-please-action v5.0.0). A release-please source
// therefore keeps its branch shape, with a suffix that stays inside the pattern's
// open-ended branch group, and has its autorelease labels copied. Any other source
// keeps the plain reauthor branch and gets no labels.
import { readFileSync } from "node:fs";

const [file, prNumber] = process.argv.slice(2);
const pr = JSON.parse(readFileSync(file, "utf-8"));

if (!pr.author?.login?.startsWith("rubicon-release-please")) {
  console.log(JSON.stringify({ branch: `chore/reauthor-pr-${prNumber}`, labels: [] }));
  process.exit(0);
}

// The plain default shape only. A component or group suffix would make the appended
// text part of the component or group name, which release-please compares.
const head = pr.headRefName ?? "";
if (!/^release-please--branches--[^/]+$/.test(head) || /--(components|groups)--/.test(head)) {
  console.error(
    `PR #${prNumber} is from release-please but its branch '${head}' is not release-please--branches--<branch>, so a reauthored copy could not keep a branch shape release-please recognizes. Refusing.`,
  );
  process.exit(1);
}

const labels = (pr.labels ?? []).map((l) => l.name).filter((n) => n.startsWith("autorelease:"));
console.log(JSON.stringify({ branch: `${head}--reauthor-pr-${prNumber}`, labels }));
