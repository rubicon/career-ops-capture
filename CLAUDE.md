# Agent Instructions for Career-Ops Capture

This is the canonical instruction file for AI coding agents working in this
repository. `AGENTS.md` is a pointer to this file.

## What this project is

A Chromium Manifest V3 browser extension that passively captures curated LinkedIn
job listings from the user's own logged-in session and POSTs them to a career-ops
app on `127.0.0.1`. Read [ARCHITECTURE.md](ARCHITECTURE.md) before making
structural changes.

## Non-negotiable invariants

- **Loopback only.** The extension may reach `www.linkedin.com` and `127.0.0.1`
  and no other host. Never add a network destination or widen `host_permissions`.
  Any change to the extension's reach must update [PRIVACY.md](PRIVACY.md) in the
  same change and be raised in an issue first.
- **Passive.** No scrolling, clicking, navigation automation, or background
  polling. Capture leaves the page only on an explicit toolbar click.
- **Fail loud.** If an extractor stops recognizing a page, throw
  `ExtractorShapeError` and surface it. Never silently return zero records.
- **Signals are captured, never invented.** Do not fabricate a match percentage,
  a Top Applicant flag, or any other signal that is not present on the page.
- **Keep the purity boundary.** Logic under `src/core/` and the `extract-*.ts`
  parsers must stay free of browser globals; inject `Document`, `fetch`, and
  storage. Browser-specific code stays in `content/`, `background/`, `ui/`,
  `platform/`.

## Working conventions

- Use test-driven development for parsing and delivery logic. The pure core is
  unit-tested under `test/`.
- Conventional Commits. Branch names `dev/<issue>-<slug>`. One issue per unit of
  work; open an issue before a feature or behavior change.
- No AI-authorship trailers in commits or pull requests. No `Co-Authored-By` an
  AI, no "Generated with" lines. Write plainly, no em-dashes, no emojis.
- Before proposing a change as done, run: `npm run lint`, `npm run format:check`,
  `npm run validate`, `npm run typecheck`, `npm test`, `npm run build`.

## Fixtures

The LinkedIn fixtures under `src/sites/linkedin/fixtures/` are synthetic
placeholders. If you refresh them from a real capture, scrub all personal data
first. Never commit a real member id or account-tied identifiers.
