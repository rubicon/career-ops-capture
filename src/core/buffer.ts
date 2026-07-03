import type { CapturedRecord } from "./types";

// Minimal storage port, satisfied by chrome.storage.local and by an in-memory
// map in tests. Keeps the buffer pure and unit-testable.
export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(obj: Record<string, unknown>): Promise<void>;
}

const KEY = "capture_buffer";

// The buffer is the source of truth: captures persist here until the receiver
// acks each url. Local dedup by url avoids re-buffering.
export class CaptureBuffer {
  constructor(private storage: StorageArea) {}

  async list(): Promise<CapturedRecord[]> {
    const got = await this.storage.get(KEY);
    return (got[KEY] as CapturedRecord[] | undefined) ?? [];
  }

  async count(): Promise<number> {
    return (await this.list()).length;
  }

  async add(records: CapturedRecord[]): Promise<number> {
    const cur = await this.list();
    const have = new Set(cur.map((r) => r.url));
    let added = 0;
    for (const r of records) {
      if (have.has(r.url)) continue;
      have.add(r.url);
      cur.push(r);
      added++;
    }
    if (added > 0) await this.storage.set({ [KEY]: cur });
    return added;
  }

  async remove(urls: string[]): Promise<void> {
    const drop = new Set(urls);
    const next = (await this.list()).filter((r) => !drop.has(r.url));
    await this.storage.set({ [KEY]: next });
  }
}
