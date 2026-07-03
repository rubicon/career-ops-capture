// Injected into the page's MAIN world ONLY when tier-3 is enabled.
// This is the single place the extension touches page runtime: it wraps fetch to
// forward Voyager job responses the SPA *already* fetched. It NEVER initiates its
// own request. It is observe-only. Anti-automation instrumentation can detect this
// wrapping, which is why it is off by default and behind an explicit setting.
(() => {
  const origFetch = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await origFetch(...args);
    try {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      if (/voyager.*(job|Job)/.test(url)) {
        res
          .clone()
          .text()
          .then((body) => {
            window.postMessage(
              { __coCapture: true, origin: location.origin, url, body },
              location.origin,
            );
          })
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
    return res;
  };
})();

export {};
