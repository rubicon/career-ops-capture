# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4](https://github.com/rubicon/career-ops-capture/compare/v0.1.3...v0.1.4) (2026-08-21)


### Features

* **ci:** attach the packaged extension zip to GitHub Releases ([#57](https://github.com/rubicon/career-ops-capture/issues/57)) ([bf0f4b8](https://github.com/rubicon/career-ops-capture/commit/bf0f4b8861d1dc029163429758243d0a52502bd6))
* **ui:** add extension icon set and redesign popup/options UI ([#55](https://github.com/rubicon/career-ops-capture/issues/55)) ([5a12968](https://github.com/rubicon/career-ops-capture/commit/5a12968e42cb84d7a5d597eadf83d6d34cee3c7f))

## [0.1.3](https://github.com/rubicon/career-ops-capture/compare/v0.1.2...v0.1.3) (2026-08-15)


### Bug Fixes

* **linkedin:** fail loud when a recognized page yields zero records ([#51](https://github.com/rubicon/career-ops-capture/issues/51)) ([01bdaf5](https://github.com/rubicon/career-ops-capture/commit/01bdaf5e3445728c52544134380b51e11a5c62a0))

## [0.1.2](https://github.com/rubicon/career-ops-capture/compare/v0.1.1...v0.1.2) (2026-08-12)


### Bug Fixes

* **ci:** stop requesting an Issues scope the release App does not grant ([#49](https://github.com/rubicon/career-ops-capture/issues/49)) ([a21e75f](https://github.com/rubicon/career-ops-capture/commit/a21e75f57dda680df3b90cda1e6f05f451a979c3)), closes [#48](https://github.com/rubicon/career-ops-capture/issues/48)

## [0.1.1](https://github.com/rubicon/career-ops-capture/compare/v0.1.0...v0.1.1) (2026-07-04)


### Features

* initial public release of career-ops-capture ([e05dd93](https://github.com/rubicon/career-ops-capture/commit/e05dd933a49429c03ba48bf251bee3eda3c33433))

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
