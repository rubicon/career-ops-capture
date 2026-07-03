import { describe, it, expect } from "vitest";
import { parseTappedPayload } from "../src/content/inject-parse";

describe("parseTappedPayload", () => {
  it("accepts only same-origin voyager job payloads with included[]", () => {
    expect(
      parseTappedPayload({
        origin: "https://www.linkedin.com",
        url: "/voyager/api/voyagerJobsDashJobCards",
        body: '{"included":[]}',
      })?.included,
    ).toBeDefined();
  });
  it("rejects a cross-origin payload", () => {
    expect(
      parseTappedPayload({ origin: "https://evil.com", url: "/voyager/jobs", body: "{}" }),
    ).toBeNull();
  });
  it("rejects a non-job voyager url", () => {
    expect(
      parseTappedPayload({ origin: "https://www.linkedin.com", url: "/unrelated", body: "{}" }),
    ).toBeNull();
  });
  it("rejects a payload without an included array", () => {
    expect(
      parseTappedPayload({
        origin: "https://www.linkedin.com",
        url: "/voyager/api/voyagerJobsDashJobCards",
        body: '{"data":{}}',
      }),
    ).toBeNull();
  });
  it("rejects invalid json", () => {
    expect(
      parseTappedPayload({
        origin: "https://www.linkedin.com",
        url: "/voyager/api/jobs",
        body: "not json",
      }),
    ).toBeNull();
  });
});
