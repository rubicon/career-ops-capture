# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-03

Initial public release.

### Added

- Chromium Manifest V3 extension that passively captures curated LinkedIn job
  listings ("Top Applicant Jobs" and "Recommended for you") from the user's own
  logged-in session.
- Local delivery to a career-ops app over loopback: on an explicit toolbar click,
  buffered captures are POSTed to `http://127.0.0.1:<port>/api/explore/add`
  (default port 3000). The extension can reach LinkedIn and loopback only.
- Curation signal capture: Top Applicant flag, match percentage, Easy Apply,
  actively recruiting, recency, and applicant count, serialized as a human `note`
  and a machine `sig` with a derived priority.
- Three-tier LinkedIn extraction, least detectable first: embedded Voyager JSON in
  the content script's isolated world, then rendered DOM cards, then a gated
  MAIN-world fetch tap that is off by default.
- A durable capture buffer in `chrome.storage.local` that survives service-worker
  eviction and browser restart, with per-record delivery acknowledgement and a
  retry alarm.
- Options page (career-ops port, auth token, per-hour soft cap, tier-3 toggle,
  per-portal enable) and a popup (passive-mode indicator, buffered count, send,
  re-authentication prompt).
- A Firefox manifest variant, a unit-test suite over parsing and delivery logic,
  a deterministic manifest validator, and a Web Store packaging script.

[Unreleased]: https://github.com/rubicon/career-ops-capture/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/rubicon/career-ops-capture/releases/tag/v0.1.0
