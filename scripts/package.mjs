#!/usr/bin/env node
// Package the built dist/ into a Chrome Web Store upload zip. Run after `build`.
import archiver from "archiver";
import { createWriteStream, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const OUT_DIR = join(ROOT, "web-ext-artifacts");

if (!existsSync(join(DIST, "manifest.json"))) {
  console.error("dist/manifest.json not found. Run `npm run build` first.");
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8")).version;
mkdirSync(OUT_DIR, { recursive: true });
const outFile = join(OUT_DIR, `career-ops-capture-${version}.zip`);

const output = createWriteStream(outFile);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Packaged ${outFile} (${archive.pointer()} bytes)`);
});
archive.on("warning", (err) => {
  throw err;
});
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
// Zip the contents of dist/ at the archive root (no leading dist/ folder), and
// exclude sourcemaps from the store upload.
archive.glob("**/*", { cwd: DIST, ignore: ["**/*.map"] });
await archive.finalize();
