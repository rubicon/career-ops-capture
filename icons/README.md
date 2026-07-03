# Icons

TODO: add the extension icons before the first Web Store submission.

The Chrome Web Store expects PNG icons at 16, 32, 48, and 128 pixels. Once the
icons exist here, wire them into `manifest.json` and `manifest.firefox.json` under
the `icons` key (and `action.default_icon`), then bump the version in a normal
release. The manifest currently ships an empty `icons` object, which is valid for
local development and unpacked loading.
