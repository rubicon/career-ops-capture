import browser from "webextension-polyfill";

// The single adapter seam. Everything browser-specific imports `browser` from
// here, so a future Safari/other-runtime port swaps one file.
export { browser };
