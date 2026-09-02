# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Career-Ops Capture v0.1.6 (2026-09-02)

Every job title this extension captured came through written twice, and nothing complained. The badge stayed green, the keyword filters matched the first half of the doubled string, and the corrupted titles landed in the tracker looking like ordinary data. The cause was a selector list resolving to the wrapper that holds both the visible title and the screen reader copy of it, which are identical apart from a badge phrase. One release ago the buffer stopped lying about where the records went. This one stops the records lying about what they are.

### Bug Fixes

* **linkedin:** read a card title once, not with its screen reader copy ([#90](https://github.com/rubicon/career-ops-capture/issues/90)) ([2aee14e](https://github.com/rubicon/career-ops-capture/commit/2aee14e26134f35f31cadfdc0f618db31c9dc9a0)), closes [#89](https://github.com/rubicon/career-ops-capture/issues/89)

### Known limitations

* LinkedIn is rolling out a new jobs UI whose markup neither extraction tier recognizes. On an account that has it, `/jobs/` and `/jobs/search-results/` produce the red fail-loud badge instead of a capture. `/jobs/collections/recommended/` still served the old markup and extracts normally. Tracked in [#81](https://github.com/rubicon/career-ops-capture/issues/81).

**Full Changelog**: https://github.com/rubicon/career-ops-capture/compare/v0.1.5...v0.1.6

## Career-Ops Capture v0.1.5 (2026-09-01)

Every capture this extension has delivered was discarded by the receiving app, which answered 200 and wrote nothing, and the extension read that as success and cleared its buffer. Four of the five fixes here are delivery and provenance bugs that all reported themselves as working. The fifth widens capture to job search pages, which LinkedIn then replaced with markup neither extractor can read. It ships anyway, because the buffer no longer lies about where the records went.

### Bug Fixes

* **delivery:** send the offers envelope the app reads, and stop acking phantom writes ([#77](https://github.com/rubicon/career-ops-capture/issues/77)) ([11c2f32](https://github.com/rubicon/career-ops-capture/commit/11c2f32640a0d76a8cceac134b908f1001902569)), closes [#76](https://github.com/rubicon/career-ops-capture/issues/76)
* **delivery:** stop downgrading the sig source token to linkedin ([#73](https://github.com/rubicon/career-ops-capture/issues/73)) ([f7ea09b](https://github.com/rubicon/career-ops-capture/commit/f7ea09b6e2c7d587d76b744c1da4e47fdf7470c1)), closes [#71](https://github.com/rubicon/career-ops-capture/issues/71)
* **linkedin:** capture job search results and label records by surface ([#75](https://github.com/rubicon/career-ops-capture/issues/75)) ([7411db0](https://github.com/rubicon/career-ops-capture/commit/7411db033828fbc7fd6b836511d66d41ebb40270)), closes [#69](https://github.com/rubicon/career-ops-capture/issues/69)
* **linkedin:** give the recommended collection its own label ([#83](https://github.com/rubicon/career-ops-capture/issues/83)) ([40fe9e4](https://github.com/rubicon/career-ops-capture/commit/40fe9e4a548b1f089d4ca992f69d3db1ac728348)), closes [#78](https://github.com/rubicon/career-ops-capture/issues/78)
* **content:** capture on in-app navigation, not only on page load ([#74](https://github.com/rubicon/career-ops-capture/issues/74)) ([b76de30](https://github.com/rubicon/career-ops-capture/commit/b76de307ae63c3f3302f3bdccaa7cc178c1d0779))

### Known limitations

* LinkedIn is rolling out a new jobs UI whose markup neither extraction tier recognizes. On an account that has it, `/jobs/` and `/jobs/search-results/` produce the red fail-loud badge instead of a capture. `/jobs/collections/recommended/` still served the old markup and extracts normally. Tracked in [#81](https://github.com/rubicon/career-ops-capture/issues/81).

**Full Changelog**: https://github.com/rubicon/career-ops-capture/compare/v0.1.4...v0.1.5

## Career-Ops Capture v0.1.4 (2026-08-21)

The toolbar has shown Chrome's default puzzle-piece icon since the first release, which said "abandoned side project" louder than anything in the code ever did. Popup and settings also got pulled out of default-browser-chrome and into something that looks like someone meant it. And starting with this release, the release itself ships with an installable zip attached, so "clone it and build it yourself" finally stops being the actual instructions.

### Features

* **ui:** add extension icon set and redesign popup/options UI ([#55](https://github.com/rubicon/career-ops-capture/issues/55)) ([0265e24](https://github.com/rubicon/career-ops-capture/commit/0265e243b8b1575f30f4c6ecfc29ee2beced9fc4))

**Full Changelog**: https://github.com/rubicon/career-ops-capture/compare/v0.1.3...v0.1.4

## [0.1.7](https://github.com/rubicon/career-ops-capture/compare/v0.1.6...v0.1.7) (2026-09-02)


### Features

* **ci:** attach the packaged extension zip to GitHub Releases ([#57](https://github.com/rubicon/career-ops-capture/issues/57)) ([568cd52](https://github.com/rubicon/career-ops-capture/commit/568cd524ff74ba267d03a02e1dc6c4094da334a6))
* initial public release of career-ops-capture ([0ccf418](https://github.com/rubicon/career-ops-capture/commit/0ccf418b738623eb7142695c333acebd09bf7fd1))
* **ui:** add extension icon set and redesign popup/options UI ([#55](https://github.com/rubicon/career-ops-capture/issues/55)) ([0265e24](https://github.com/rubicon/career-ops-capture/commit/0265e243b8b1575f30f4c6ecfc29ee2beced9fc4))


### Bug Fixes

* **ci:** stop requesting an Issues scope the release App does not grant ([#49](https://github.com/rubicon/career-ops-capture/issues/49)) ([c8546a6](https://github.com/rubicon/career-ops-capture/commit/c8546a6664cb9a1d87e66e943347872af4abe2f7)), closes [#48](https://github.com/rubicon/career-ops-capture/issues/48)
* **content:** capture on in-app navigation, not only on page load ([#74](https://github.com/rubicon/career-ops-capture/issues/74)) ([b76de30](https://github.com/rubicon/career-ops-capture/commit/b76de307ae63c3f3302f3bdccaa7cc178c1d0779))
* **delivery:** send the offers envelope the app reads, and stop acking phantom writes ([#77](https://github.com/rubicon/career-ops-capture/issues/77)) ([11c2f32](https://github.com/rubicon/career-ops-capture/commit/11c2f32640a0d76a8cceac134b908f1001902569)), closes [#76](https://github.com/rubicon/career-ops-capture/issues/76)
* **delivery:** stop downgrading the sig source token to linkedin ([#73](https://github.com/rubicon/career-ops-capture/issues/73)) ([f7ea09b](https://github.com/rubicon/career-ops-capture/commit/f7ea09b6e2c7d587d76b744c1da4e47fdf7470c1)), closes [#71](https://github.com/rubicon/career-ops-capture/issues/71)
* **linkedin:** capture job search results and label records by surface ([#75](https://github.com/rubicon/career-ops-capture/issues/75)) ([7411db0](https://github.com/rubicon/career-ops-capture/commit/7411db033828fbc7fd6b836511d66d41ebb40270)), closes [#69](https://github.com/rubicon/career-ops-capture/issues/69)
* **linkedin:** fail loud when a recognized page yields zero records ([#51](https://github.com/rubicon/career-ops-capture/issues/51)) ([37e325a](https://github.com/rubicon/career-ops-capture/commit/37e325abc11a0f20d19639b2c3ebfedd7d73b2c2))
* **linkedin:** give the recommended collection its own label ([#83](https://github.com/rubicon/career-ops-capture/issues/83)) ([40fe9e4](https://github.com/rubicon/career-ops-capture/commit/40fe9e4a548b1f089d4ca992f69d3db1ac728348)), closes [#78](https://github.com/rubicon/career-ops-capture/issues/78)
* **linkedin:** read a card title once, not with its screen reader copy ([#90](https://github.com/rubicon/career-ops-capture/issues/90)) ([2aee14e](https://github.com/rubicon/career-ops-capture/commit/2aee14e26134f35f31cadfdc0f618db31c9dc9a0))

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
