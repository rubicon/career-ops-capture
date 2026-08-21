# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Career-Ops Capture v0.1.4 (2026-08-21)

The toolbar has shown Chrome's default puzzle-piece icon since the first release, which said "abandoned side project" louder than anything in the code ever did. Popup and settings also got pulled out of default-browser-chrome and into something that looks like someone meant it. And starting with this release, the release itself ships with an installable zip attached, so "clone it and build it yourself" finally stops being the actual instructions.

### Features

* **ui:** add extension icon set and redesign popup/options UI ([#55](https://github.com/rubicon/career-ops-capture/issues/55)) ([0265e24](https://github.com/rubicon/career-ops-capture/commit/0265e243b8b1575f30f4c6ecfc29ee2beced9fc4))

**Full Changelog**: https://github.com/rubicon/career-ops-capture/compare/v0.1.3...v0.1.4

## [0.1.3](https://github.com/rubicon/career-ops-capture/compare/v0.1.2...v0.1.3) (2026-08-15)


### Bug Fixes

* **linkedin:** fail loud when a recognized page yields zero records ([#51](https://github.com/rubicon/career-ops-capture/issues/51)) ([37e325a](https://github.com/rubicon/career-ops-capture/commit/37e325abc11a0f20d19639b2c3ebfedd7d73b2c2))

## [0.1.2](https://github.com/rubicon/career-ops-capture/compare/v0.1.1...v0.1.2) (2026-08-12)


### Bug Fixes

* **ci:** stop requesting an Issues scope the release App does not grant ([#49](https://github.com/rubicon/career-ops-capture/issues/49)) ([c8546a6](https://github.com/rubicon/career-ops-capture/commit/c8546a6664cb9a1d87e66e943347872af4abe2f7)), closes [#48](https://github.com/rubicon/career-ops-capture/issues/48)

## [0.1.1](https://github.com/rubicon/career-ops-capture/compare/v0.1.0...v0.1.1) (2026-07-04)


### Features

* initial public release of career-ops-capture ([0ccf418](https://github.com/rubicon/career-ops-capture/commit/0ccf418b738623eb7142695c333acebd09bf7fd1))

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

[Unreleased]: https://github.com/rubicon/career-ops-capture/compare/v0.1.4...HEAD
[0.1.0]: https://github.com/rubicon/career-ops-capture/releases/tag/v0.1.0
