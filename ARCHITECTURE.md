# Architecture

Career-Ops Capture is a Chromium Manifest V3 extension built around a small, pure
core with thin browser-specific glue around it. This document explains the layout,
the design boundaries, and the data flow.

## Layout

```
manifest.json            MV3 manifest (Chromium)
manifest.firefox.json    Firefox manifest variant
esbuild.mjs              Bundles src/ entry points into dist/
scripts/
  validate-manifest.mjs  Deterministic MV3 + version-sync + host-allowlist check
  package.mjs            Zips dist/ into a Web Store artifact
src/
  core/                  Pure, unit-tested logic (no browser globals)
    types.ts             CapturedRecord, Signals, SiteModule, AuthState, ...
    signals.ts           deriveNote / deriveSig / derivePrio
    buffer.ts            CaptureBuffer over an injected storage port
    delivery.ts          deliver() one record to /api/explore/add
    drain.ts             drainBuffer() with per-record acknowledgement
    settings.ts          load / save settings with defaults
    capture-run.ts       orchestrates find -> auth-gate -> extract -> buffer
    registry.ts          site-module registry
  sites/
    linkedin/            the LinkedIn site module
      index.ts           tier orchestration + fail-loud + matches()
      extract-embedded.ts  tier 1: parse embedded Voyager JSON
      extract-dom.ts       tier 2: parse rendered job cards
      auth.ts              isolated-world auth-state detection
      fixtures/            synthetic test fixtures
  content/
    content.ts           isolated-world content script entry
    inject.ts            tier-3 MAIN-world fetch tap (gated, off by default)
    inject-parse.ts      pure validator for tapped payloads
  background/
    service-worker.ts    badge, drain on click, retry alarm, soft cap
  ui/
    options.html/.ts     settings page
    popup.html/.ts       popup
  platform/
    browser.ts           webextension-polyfill adapter seam
test/                    Vitest specs mirroring src/
```

## The purity boundary

Everything under `src/core/` and the `extract-*.ts` parsers is pure. It takes a
`Document`, a `fetch` implementation, or a storage port as an injected argument
rather than reaching for `chrome.*`, `window`, or the global `fetch`. That is what
lets the logic run under Vitest with jsdom in plain Node, with no browser mocking,
and it is also what would keep a future port to another runtime cheap.

Everything browser-specific lives in `content/`, `background/`, `ui/`, and
`platform/`. Those files are thin: they gather the live `document`, the real
storage area, and the real `fetch`, and hand them to the pure core.

## Extraction tiers

LinkedIn extraction runs least-detectable first. Each tier reports whether it
recognized the page shape, which drives the fallback and the fail-loud behavior.

1. **Embedded model JSON, isolated world.** LinkedIn hydrates the page from model
   JSON in hidden `<code>` blocks. Reading them from the extension's isolated
   world is invisible to the page and yields the richest data. This is the
   default and the preferred tier.
2. **Rendered DOM cards, isolated world.** If no embedded models are found, the
   parser falls back to scraping the visible job-card DOM. Still isolated-world,
   lower fidelity.
3. **MAIN-world fetch tap, gated.** If both fail to supply a needed signal, an
   optional MAIN-world script can observe the responses LinkedIn's own site
   fetches. This is the only code that touches the page runtime, it is off by
   default, and it never initiates a request of its own.

If no tier recognizes the page, the module throws `ExtractorShapeError`. The
service worker turns the toolbar badge red and sets a title that says the
extractor needs updating. Nothing is silently dropped.

## Site-module interface

A site module is the churn-isolation seam. It implements:

```ts
interface SiteModule {
  id: string;
  matches(url: string): boolean;
  extract(ctx: ExtractContext): CapturedRecord[];
  detectAuthState(ctx: ExtractContext): AuthState;
}
```

All LinkedIn-specific selectors and JSON shapes live inside the `linkedin` module.
Adding another board is one new module under `src/sites/<id>/` plus a registration;
the shell does not change.

## Data flow

1. You open a supported curated page. The content script runs the matching site
   module in the isolated world.
2. `detectAuthState` gates the run. If it sees a login wall or a logged-out
   marker, the run stops and the popup offers a re-authentication prompt.
3. `extract` produces normalized `CapturedRecord`s with signals. They are deduped
   locally by URL and written to the capture buffer in `chrome.storage.local`. The
   badge shows the count. Nothing has left the page.
4. When you click Send captures in the popup, the service worker drains the buffer:
   each record is POSTed to `http://127.0.0.1:<port>/api/explore/add`, and a
   record is removed from the buffer only after a successful acknowledgement.
   Failures stay buffered and retry on the next click and on a periodic alarm.

## Signals

Signals are captured, never invented. Each record carries a `note` (human
readable) and a `sig` (compact machine tag) with a derived priority. The priority
is used only for downstream ordering; it does not affect any scoring in career-ops.

## Delivery contract

The request body is `{ url, company, title, location, source }`, plus
forward-compatible `note` and `sig` fields. The field is `title`, not `role`. An
optional `X-Career-Ops-Token` header is sent when a token is configured. The exact
authentication and response shape of `/api/explore/add` should be verified against
your running career-ops app; see `docs/manual-testing.md`.

## Cross-browser

One codebase produces a Chromium build and a Firefox build. Browser API calls go
through `src/platform/browser.ts`, which re-exports `webextension-polyfill`, so the
port surface stays small.
