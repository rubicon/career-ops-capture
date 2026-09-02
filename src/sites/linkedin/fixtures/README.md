# LinkedIn fixtures: synthetic placeholders

These files are NOT real LinkedIn captures. They are hand authored to mirror the
documented shape the extractors target, and they contain no personal data and no
real job IDs:

- `top-applicant.voyager.json` is the Voyager `included[]` array of typed
  `jobPosting` entities that LinkedIn hydrates from hidden `<code>` blocks. It is
  consumed by the tier-1 parser in `extract-embedded.ts`.
- `cards.html` is a rendered job-card list `<ul>`. It is consumed by the tier-2
  parser in `extract-dom.ts`. Its last two cards carry the title wrapper shape
  observed in the wild: a visible label marked `aria-hidden`, followed by a screen
  reader copy that repeats the label and, on a verified company, appends a badge
  phrase. One has a whitespace text node between the halves and the other does not,
  because both spacings occur. Keep both when you refresh this file; reading the
  wrapper's whole subtree reports every title twice.
- `churned-title.voyager.json` is the same payload shape with the title key
  renamed, so every card fails the required-field guard. It pins the rule that a
  recognized page yielding zero records falls back and then fails loud.
- `no-jobs.voyager.json` is a collection that hydrates normally and holds no job
  postings. It pins the opposite rule: that case is a clean empty capture. Its
  `included` is deliberately empty and must stay that way. The empty-state signal
  has to come from the collection block itself (`*elements` and `paging.total`); if
  the fixture carried a filler entity, the test would pass on a parser that only
  counts entities and still throws on the real shape.

## Before any release, replace with a real, PII-scrubbed capture

LinkedIn's Voyager key names and card selectors change and cannot be guessed
reliably. To refresh:

1. Log in to LinkedIn and open the "Top Applicant Jobs" collection.
2. Capture a real embedded-model payload (view-source `<code>` blocks, or the
   Network tab `voyager...JobCards` response) and the rendered card `<ul>`
   outer HTML.
3. Scrub personal data (your member id and any personal identifiers) but keep the
   job fields.
   While you are there, capture a collection that is genuinely **empty** (filter a
   curated collection down to no results) and record whether its block ships a
   `paging` object and whether that object carries `total`. That is the one open
   question behind `blockConfirmsEmpty`: an absent total currently does not withdraw
   an empty `*elements` list, because Rest.li omits `total` when the resource has
   none. A real empty capture is what would let that be tightened without
   red-badging ordinary empty pages.
4. Overwrite these fixtures, run `npm test`, and reconcile only the `pick*` /
   selector accessors in `extract-embedded.ts` / `extract-dom.ts` if a path
   assertion fails. Do not weaken the URL or shape assertions.

Until then the parsers are verified against representative shapes, but the exact
real-world field paths remain unconfirmed. See `docs/manual-testing.md` for the
end-to-end procedure.
