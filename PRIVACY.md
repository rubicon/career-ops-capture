# Privacy Policy

_Last updated: 2026-07-03_

Career-Ops Capture is a browser extension that reads curated job listings you open
in your own logged-in session and sends them to a career-ops application running
on your own computer. This policy describes exactly what it reads, where that data
goes, and what it never does.

## Single purpose

The extension has one purpose: to capture curated job listings and their ranking
signal from pages you open, and deliver them to a career-ops endpoint on your own
machine.

## What the extension reads

When you open a supported LinkedIn curated page ("Top Applicant Jobs" or
"Recommended for you"), the extension reads the job listings rendered on that
page. For each listing it extracts:

- The job posting URL.
- The job title.
- The company name.
- The location, when shown.
- The curation signal LinkedIn displays, such as the Top Applicant flag, the match
  percentage, Easy Apply, whether the employer is actively recruiting, how
  recently the job was posted, and the applicant count.

It reads these only from pages you navigate to yourself. It does not scroll,
click, or navigate on your behalf, and it does not run in the background.

## What the extension does not read

- It does not read your LinkedIn profile, connections, messages, or feed.
- It does not read your account credentials. It uses the session you are already
  logged into and never sees or stores your password.
- It does not read pages on any site other than `www.linkedin.com`.

## Where captured data goes

Captured listings are held locally in the browser's extension storage
(`chrome.storage.local`) until you choose to send them. When you click Send
captures, the extension delivers them to the career-ops endpoint you configured,
which is always a loopback address on your own computer:
`http://127.0.0.1:<port>/api/explore/add`.

This is the only place captured data is sent. The extension's manifest grants it
network access to `www.linkedin.com` and `127.0.0.1` and to no other host, so it
is technically incapable of sending your data anywhere else. You can verify this
in `manifest.json` under `host_permissions`.

## What the extension never does

- No telemetry. It collects no usage metrics.
- No analytics. It contains no analytics or tracking code.
- No third-party transmission. It sends nothing to the author, to Rubicon
  TechVentures, or to any external service.
- No remote servers. The project has no backend. The only recipient of your data
  is the career-ops app on your own machine.
- No selling or sharing of data. There is nothing to sell or share, because your
  data never leaves your computer except to your own local application.

## The optional token

If your local career-ops endpoint requires an authentication token, you can enter
it on the options page. The token is stored locally in `chrome.storage.local` and
is sent only to your `127.0.0.1` endpoint, in the `X-Career-Ops-Token` request
header. It is never transmitted anywhere else.

## The optional tier-3 network tap

The extension includes an optional, off-by-default feature that observes
LinkedIn's own network responses within the page to recover a signal that is not
present in the page markup. It only observes responses that LinkedIn's own site
already requested; it never initiates network requests of its own, and captured
data still goes only to your loopback endpoint. This feature stays off unless you
explicitly enable it in settings.

## Data retention and removal

Captured listings remain in local extension storage until they are successfully
delivered to your career-ops app, after which they are removed from the buffer.
Your settings (port, optional token, and preferences) remain in local storage
until you change them. Removing the extension deletes all of its local storage,
including the buffer, the token, and your settings.

## Changes to this policy

If the data-handling behavior of the extension changes, this policy and the
permissions in the manifest will be updated together, and the change will be noted
in [CHANGELOG.md](CHANGELOG.md).

## Contact

Questions about this policy can be sent to dax@rubicontv.com.
