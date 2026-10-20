// Thrown when no known extraction tier recognizes the page shape. Drives the
// fail-loud red badge. Never silently drop. Lives apart from index.ts so the parsers
// can throw it without importing the module that imports them.
export class ExtractorShapeError extends Error {
  constructor(msg = "LinkedIn extractor recognized no known shape, needs update") {
    super(msg);
    this.name = "ExtractorShapeError";
  }
}
