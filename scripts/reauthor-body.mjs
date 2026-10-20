// Builds the body of a reauthored PR (see .github/workflows/reauthor-bot-pr.yaml) and
// prints it. Usage: node scripts/reauthor-body.mjs <source-pr.json> <pr-number>
//
// release-please recognizes a merged release PR by the notes block it wrote into the
// PR body, between the first and last bare `---` line. A body without that block is
// not a release PR to it, so no tag or release is created. A release-please source
// therefore keeps its body, and the reauthor note is appended after it. Appending
// after the footer leaves the notes block untouched, provided the note itself
// contains no bare `---` line.
import { readFileSync } from "node:fs";

const [file, prNumber] = process.argv.slice(2);
const pr = JSON.parse(readFileSync(file, "utf-8"));

const note = `Reauthored copy of #${prNumber}'s diff, authored and signed as the maintainer instead of the bot. The content is unchanged, and this goes through the same required checks and the same human merge as the original.

#${prNumber} is left open on purpose. Closing it is a merge-time judgment call, and closing it early tells Dependabot the advisory was declined, so it will not raise a fresh PR for the same one.`;

if (!pr.author?.login?.startsWith("rubicon-release-please")) {
  process.stdout.write(`${note}\n`);
  process.exit(0);
}

const lines = (pr.body ?? "").trim().replace(/\r\n/g, "\n").split("\n");
if (!lines.includes("---")) {
  console.error(
    `PR #${prNumber} is from release-please but its body has no '---' notes delimiter, so a reauthored copy would not be recognized as a release PR. Refusing.`,
  );
  process.exit(1);
}
process.stdout.write(`${pr.body.trim()}\n\n${note}\n`);
