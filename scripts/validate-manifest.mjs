#!/usr/bin/env node
// Deterministic MV3 manifest validator. Checks both the Chrome and Firefox
// manifests for the structural fields the extension needs, and asserts the
// manifest versions stay in lockstep with package.json. Runs in CI.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf-8"));
}

const pkg = read("package.json");
const targets = ["manifest.json", "manifest.firefox.json"];
const errors = [];

for (const rel of targets) {
  let m;
  try {
    m = read(rel);
  } catch (e) {
    errors.push(`${rel}: not valid JSON (${e.message})`);
    continue;
  }
  const req = (cond, msg) => {
    if (!cond) errors.push(`${rel}: ${msg}`);
  };

  req(m.manifest_version === 3, "manifest_version must be 3");
  req(typeof m.name === "string" && m.name.length > 0, "name must be a non-empty string");
  req(typeof m.version === "string", "version must be a string");
  req(
    m.version === pkg.version,
    `version ${m.version} must match package.json version ${pkg.version}`,
  );
  req(
    typeof m.description === "string" && m.description.length > 0,
    "description must be non-empty",
  );
  req(
    m.background && typeof m.background.service_worker === "string",
    "background.service_worker required",
  );
  req(m.action && typeof m.action.default_popup === "string", "action.default_popup required");
  req(Array.isArray(m.permissions), "permissions must be an array");
  req(Array.isArray(m.host_permissions), "host_permissions must be an array");
  req(Array.isArray(m.content_scripts) && m.content_scripts.length > 0, "content_scripts required");

  // Privacy invariant: the only non-LinkedIn host the extension may talk to is
  // loopback. If this ever widens, PRIVACY.md must be revisited.
  const hosts = m.host_permissions || [];
  const nonLoopback = hosts.filter(
    (h) =>
      !h.startsWith("https://www.linkedin.com/") && !/^https?:\/\/127\.0\.0\.1(:\d+|\/)/.test(h),
  );
  req(
    nonLoopback.length === 0,
    `host_permissions must be limited to linkedin.com and loopback; found ${JSON.stringify(nonLoopback)}`,
  );
}

if (errors.length) {
  console.error("Manifest validation FAILED:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Manifest validation OK (${targets.join(", ")} at v${pkg.version})`);
