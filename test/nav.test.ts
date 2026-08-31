import { describe, it, expect } from "vitest";
import { captureKey, nextCaptureKey } from "../src/core/nav";
import { linkedInModule } from "../src/sites/linkedin/index";

const supported = (url: string) => linkedInModule.matches(url);
const CURATED = "https://www.linkedin.com/jobs/collections/top-applicant/";

describe("captureKey", () => {
  it("ignores the params that name the selected card", () => {
    expect(captureKey(`${CURATED}?currentJobId=1&refId=a&trackingId=b&position=1&pageNum=0`)).toBe(
      captureKey(`${CURATED}?currentJobId=2&refId=c&trackingId=d&position=2&pageNum=0`),
    );
  });
  it("ignores a trailing slash and param order", () => {
    expect(captureKey("https://www.linkedin.com/jobs/search-results/?b=2&a=1")).toBe(
      captureKey("https://www.linkedin.com/jobs/search-results?a=1&b=2"),
    );
  });
  it("keeps params that define which jobs the page holds", () => {
    expect(
      captureKey("https://www.linkedin.com/jobs/search-results/?keywords=vp+marketing"),
    ).not.toBe(captureKey("https://www.linkedin.com/jobs/search-results/?keywords=cmo"));
  });
  it("distinguishes two curated collections", () => {
    expect(captureKey("https://www.linkedin.com/jobs/collections/top-applicant/")).not.toBe(
      captureKey("https://www.linkedin.com/jobs/collections/recommended/"),
    );
  });
});

describe("nextCaptureKey", () => {
  it("returns a key for a first visit to a supported page", () => {
    expect(nextCaptureKey(null, CURATED, supported)).toBe(captureKey(CURATED));
  });
  it("returns null for an unsupported page", () => {
    expect(nextCaptureKey(null, "https://www.linkedin.com/feed/", supported)).toBeNull();
    expect(nextCaptureKey(null, "https://www.linkedin.com/messaging/", supported)).toBeNull();
  });
  it("returns null while only the selected card changes", () => {
    const first = nextCaptureKey(null, `${CURATED}?currentJobId=1`, supported);
    expect(first).not.toBeNull();
    expect(nextCaptureKey(first, `${CURATED}?currentJobId=2&refId=x`, supported)).toBeNull();
    expect(nextCaptureKey(first, `${CURATED}?currentJobId=3&trackingId=y`, supported)).toBeNull();
  });
  it("returns a new key when the page moves to another supported list", () => {
    const first = nextCaptureKey(null, CURATED, supported);
    const second = nextCaptureKey(
      first,
      "https://www.linkedin.com/jobs/collections/recommended/",
      supported,
    );
    expect(second).toBe(captureKey("https://www.linkedin.com/jobs/collections/recommended/"));
  });
  it("captures the login wall so the re-auth prompt still fires", () => {
    expect(nextCaptureKey(null, "https://www.linkedin.com/authwall", supported)).not.toBeNull();
  });
});
