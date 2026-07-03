# Career-Ops Capture

Capture the curated job listings LinkedIn shows you, along with their ranking
signal, and send them to a career-ops app running on your own machine.

[![CI](https://github.com/rubicon/career-ops-capture/actions/workflows/ci.yaml/badge.svg)](https://github.com/rubicon/career-ops-capture/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What it does

Job boards surface personalized, algorithm-ranked lists that carry a signal you
cannot get from an ATS API or an email alert. The clearest example is LinkedIn's
"Top Applicant Jobs" collection and its match percentage. Career-Ops Capture reads
those listings inside your own logged-in LinkedIn session, keeps the curation
signal attached, and hands the results to your local
[career-ops](https://github.com/santifer/career-ops) pipeline as a new intake
channel.

It is deliberately conservative. It reads only pages you navigate to yourself. It
does not scroll, click, or navigate for you, and it does not poll in the
background. Nothing leaves the page until you click the toolbar button, and when
it does, it goes to one place only: a loopback address on your own computer.

## Why it exists

Career-ops already ingests jobs from ATS scanners and email alerts. The
highest-signal leads, the ones a board's own algorithm flagged as a strong match,
never arrive through either. This extension fills that gap without headless
scraping, stored cookies, or a server. It rides the session you already have.

## Features

- Passive capture of LinkedIn "Top Applicant Jobs" and "Recommended for you"
  listings from your own logged-in session.
- Curation signal capture: Top Applicant flag, match percentage, Easy Apply,
  actively recruiting, recency, and applicant count. Each capture carries a
  human-readable `note` and a compact machine `sig` with a derived priority.
- Least-detectable extraction, in order: embedded LinkedIn model JSON read from
  the content script's isolated world, then the rendered job-card DOM, then a
  gated MAIN-world network tap that is off by default.
- A durable capture buffer in `chrome.storage.local`. Captures survive
  service-worker eviction, browser restart, and a career-ops app that is not
  running. Delivery retries on the next click and on a periodic alarm, with
  per-record acknowledgement so nothing double-sends.
- Loopback-only delivery. The extension can reach `www.linkedin.com` and
  `127.0.0.1` and nothing else, enforced by its manifest.
- A settings page for the career-ops port, an optional auth token, a per-hour
  soft cap, the tier-3 toggle, and per-portal enablement.
- A Chromium build and a Firefox manifest variant from one codebase.

## Permissions and privacy

The extension requests only what it needs to do the job:

| Permission               | Why                                                                     |
| ------------------------ | ----------------------------------------------------------------------- |
| `host: www.linkedin.com` | Read the curated job pages you open.                                    |
| `host: 127.0.0.1`        | Deliver captures to your local career-ops app. This is the only sink.   |
| `storage`                | Hold the capture buffer and your settings.                              |
| `activeTab`, `scripting` | Run the content script on the LinkedIn tab you are viewing.             |
| `alarms`                 | Schedule delivery retries for buffered captures.                        |
| `tabs`                   | Open the LinkedIn login page when a re-authentication prompt is needed. |

Captured data is sent only to the career-ops endpoint you configure on
`127.0.0.1`. There is no telemetry, no analytics, and no third-party
transmission. See [PRIVACY.md](PRIVACY.md) for the full policy.

## Screenshots

TODO: add popup and options-page screenshots before the first Web Store
submission. Place them under `docs/screenshots/` and link them here.

## Install (unpacked, for development)

```bash
npm install
npm run build          # Chromium build to dist/
npm run build:firefox  # Firefox variant to dist/
```

- Chrome, Edge, Brave, and other Chromium browsers: open `chrome://extensions`,
  turn on Developer mode, click Load unpacked, and select the `dist/` directory.
- Firefox: run `npm run build:firefox`, open `about:debugging`, choose This
  Firefox, click Load Temporary Add-on, and select `dist/manifest.json`.

A packaged Web Store zip is produced by `npm run package` into
`web-ext-artifacts/`.

## Configuration

Open the options page (right-click the toolbar icon and choose Options, or use
the Settings link in the popup) and set:

- **career-ops API port.** The extension delivers to
  `http://127.0.0.1:<port>/api/explore/add`. The default port is `3000`, which is
  the career-ops web app's default. The host is fixed to `127.0.0.1` (loopback)
  and cannot be changed, which is what guarantees captures never leave your
  machine.
- **Dashboard token.** Sent as the `X-Career-Ops-Token` header. Set it only if
  your career-ops endpoint requires a token; leave it blank otherwise.
- **Soft cap.** A per-hour capture count that triggers a warning in the toolbar
  title. It never blocks capture.
- **Tier-3 MAIN-world fetch tap.** Off by default and higher risk. Enable it only
  if a needed signal stops appearing through the default tiers. See
  [ARCHITECTURE.md](ARCHITECTURE.md).
- **Portals.** LinkedIn is the live module. Indeed and Glassdoor are shown as
  placeholders for future modules.

## Usage

1. Start your career-ops app locally so its `/api/explore/add` endpoint is
   listening on the port you configured.
2. Log in to LinkedIn and open the "Top Applicant Jobs" collection.
3. The toolbar badge shows the number of listings captured from that page. A red
   `!` badge means LinkedIn changed its page shape and the extractor needs
   updating.
4. Open the popup and click Send captures. The buffer drains to career-ops and the
   badge clears. Records that fail to deliver stay buffered and retry later.
5. If a page load lands on a LinkedIn login wall, the popup offers a Log in to
   LinkedIn button and no capture occurs until you are signed in again.

## Development

```bash
npm run lint          # ESLint
npm run format        # Prettier write
npm run format:check  # Prettier check (CI gate)
npm run validate      # Manifest validation (MV3 structure, version sync, host allowlist)
npm run typecheck     # tsc --noEmit
npm test              # Vitest unit tests
npm run build         # Build dist/ (Chromium)
npm run package       # Build and zip for the Web Store
```

The parsing, buffering, and delivery logic is pure and unit-tested. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the layout and the design boundaries.

## Versioning and releases

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
and keeps a [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) history in
[CHANGELOG.md](CHANGELOG.md). Releases are proposed by release automation from
Conventional Commit history. The `manifest.json`, `manifest.firefox.json`, and
`package.json` versions are kept in lockstep and checked by `npm run validate`.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the
development setup, commit conventions, and pull-request process, and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations. Questions go
to [Discussions](https://github.com/rubicon/career-ops-capture/discussions), not
the issue tracker.

## License

MIT. See [LICENSE](LICENSE).

## Contributors

![Contributors](https://contrib.rocks/image?repo=rubicon/career-ops-capture)
