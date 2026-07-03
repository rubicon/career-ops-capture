# Manual testing

The unit tests cover the parsing, buffering, and delivery logic. This document
covers the end-to-end path that needs a real browser and a running career-ops app.

## Prerequisites

- A career-ops app running locally with its `/api/explore/add` endpoint listening.
  Note the port (the career-ops web app defaults to 3000).
- Before relying on end-to-end delivery, verify three things against your running
  app:
  1. The serving port.
  2. Whether `/api/explore/add` requires an auth token. If it does, set the token
     on the options page.
  3. How the endpoint handles a cross-origin request from a `chrome-extension://`
     origin.

## Steps

1. `npm run build`, then load `dist/` unpacked (Chrome: `chrome://extensions`,
   Developer mode, Load unpacked). Confirm there are no manifest errors and the
   service worker logs that it installed.
2. Open the options page. Set the career-ops port (default 3000), add a token only
   if your endpoint requires one, keep tier-3 off, and leave LinkedIn enabled.
   Save, then reopen to confirm the values persisted.
3. Log in to LinkedIn and open the "Top Applicant Jobs" collection.
4. The toolbar badge shows a count greater than zero. If it shows a red `!`, the
   extractor no longer recognizes the page: capture a fresh fixture and reconcile
   the accessors as described in `src/sites/linkedin/fixtures/README.md`.
5. Open the popup and click Send captures. The badge clears and your career-ops
   app receives the listings.
6. Reopen the same page and send again. Your career-ops app should dedupe, so no
   duplicate leads appear.
7. Log out of LinkedIn and reopen the curated page. The popup should show a Log in
   to LinkedIn button and no capture should occur.

## Fixtures are synthetic until this runs

The fixtures under `src/sites/linkedin/fixtures/` are hand-authored placeholders.
Step 4 is where you capture a real payload and reconcile any changed field paths.
Do this before a public release or a Web Store submission.

## Tier-3, optional and higher risk

Only if the default tiers stop yielding a required signal, enable the tier-3
MAIN-world fetch tap in options. It wraps `window.fetch` in LinkedIn's page world,
which anti-automation instrumentation can detect. Leave it off unless you have a
specific reason.
