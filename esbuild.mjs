import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

const entries = {
  "content/content": "src/content/content.ts",
  "content/inject": "src/content/inject.ts",
  "background/service-worker": "src/background/service-worker.ts",
  "ui/options": "src/ui/options.ts",
  "ui/popup": "src/ui/popup.ts",
};

mkdirSync("dist", { recursive: true });
mkdirSync("dist/ui", { recursive: true });

await build({
  entryPoints: entries,
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "chrome114",
  sourcemap: true,
  logLevel: "info",
});

// Chrome manifest by default; Firefox variant when TARGET=firefox.
const manifest = process.env.TARGET === "firefox" ? "manifest.firefox.json" : "manifest.json";
cpSync(manifest, "dist/manifest.json");
cpSync("src/ui/options.html", "dist/ui/options.html");
cpSync("src/ui/popup.html", "dist/ui/popup.html");

console.log(`built dist/ (manifest: ${manifest})`);
