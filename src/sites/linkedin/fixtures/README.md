# LinkedIn fixtures: synthetic placeholders

These files are NOT real LinkedIn captures. They are hand authored to mirror the
documented shape the extractors target, and they contain no personal data and no
real job IDs:

- `top-applicant.voyager.json` is the Voyager `included[]` array of typed
  `jobPosting` entities that LinkedIn hydrates from hidden `<code>` blocks. It is
  consumed by the tier-1 parser in `extract-embedded.ts`.
- `cards.html` is a rendered job-card list `<ul>`. It is consumed by the tier-2
  parser in `extract-dom.ts`.

## Before any release, replace with a real, PII-scrubbed capture

LinkedIn's Voyager key names and card selectors change and cannot be guessed
reliably. To refresh:

1. Log in to LinkedIn and open the "Top Applicant Jobs" collection.
2. Capture a real embedded-model payload (view-source `<code>` blocks, or the
   Network tab `voyager...JobCards` response) and the rendered card `<ul>`
   outer HTML.
3. Scrub personal data (your member id and any personal identifiers) but keep the
   job fields.
4. Overwrite these fixtures, run `npm test`, and reconcile only the `pick*` /
   selector accessors in `extract-embedded.ts` / `extract-dom.ts` if a path
   assertion fails. Do not weaken the URL or shape assertions.

Until then the parsers are verified against representative shapes, but the exact
real-world field paths remain unconfirmed. See `docs/manual-testing.md` for the
end-to-end procedure.
