# Contributing

Thanks for your interest in improving Career-Ops Capture. This document covers how
to set up the project, the conventions the repository enforces, and how changes
get merged.

## Development setup

You need Node.js 18 or newer.

```bash
git clone https://github.com/rubicon/career-ops-capture.git
cd career-ops-capture
npm install
```

Common commands:

```bash
npm run build         # Build dist/ (Chromium)
npm run build:firefox # Build dist/ (Firefox variant)
npm test              # Run the unit tests
npm run typecheck     # Type-check without emitting
npm run lint          # ESLint
npm run format        # Prettier write
npm run format:check  # Prettier check
npm run validate      # Manifest validation
```

Load the unpacked extension from `dist/` as described in the
[README](README.md#install-unpacked-for-development).

## Before you open a pull request

Run the checks CI will run:

```bash
npm run lint
npm run format:check
npm run validate
npm run typecheck
npm test
npm run build
```

All of these must pass. The `validate` step also confirms the manifest versions
match `package.json` and that the extension's host permissions stay limited to
LinkedIn and loopback.

## Issues and branches

- Open an issue before starting work on a feature or a behavior change. Bug fixes
  and documentation corrections can go straight to a pull request.
- Use one branch per issue, named `dev/<issue-number>-<short-kebab-description>`,
  for example `dev/12-recommended-surface-selectors`.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
Use one of these types: `feat`, `fix`, `chore`, `docs`, `test`, `ci`, `refactor`,
`build`, `perf`, `revert`, `style`. Breaking changes use a `!` after the type or a
`BREAKING CHANGE:` footer.

Do not add AI-authorship trailers such as `Co-Authored-By` an AI or "Generated
with" lines. Write commit messages plainly.

## Pull requests

- Keep a pull request scoped to one issue or one tightly related change.
- Fill in the pull-request template: what changed, the related issue, the type of
  change, and the checklist.
- Link the issue with closing syntax, for example `Closes #12`, when the pull
  request resolves it.
- Do not merge with failing checks.

## Working with LinkedIn fixtures

The tests run against fixtures under `src/sites/linkedin/fixtures/`. These are
synthetic placeholders that mirror the real page shapes. If you refresh them from
a real capture, scrub all personal data first. Never commit your member id, real
job identifiers tied to your account, or any other personal information. See the
[fixtures README](src/sites/linkedin/fixtures/README.md).

## Respect the privacy model

The extension can reach `www.linkedin.com` and `127.0.0.1` and nothing else. Any
change that would widen the host permissions, add a network destination, or
introduce telemetry must be discussed in an issue first and must update
[PRIVACY.md](PRIVACY.md) in the same change. Pull requests that quietly broaden
the extension's reach will not be merged.

## Adding another job board

The extraction layer is built around a small site-module interface. Adding a board
means adding one module under `src/sites/<id>/` that implements that interface. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the contract and the existing LinkedIn
module as a reference.
