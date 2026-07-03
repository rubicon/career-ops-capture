import type { CaptureBuffer } from "./buffer";
import { deliver, type DeliveryConfig, type FetchImpl } from "./delivery";

// Delivers each buffered record; removes a url from the buffer only on a
// successful ack, so failed records survive for the retry alarm. Pure (fetch +
// buffer injected). Per-record ack means a partial batch never double-sends.
export async function drainBuffer(
  buffer: CaptureBuffer,
  cfg: DeliveryConfig,
  fetchImpl: FetchImpl,
): Promise<{ delivered: number; duplicate: number; failed: number }> {
  const records = await buffer.list();
  let delivered = 0,
    duplicate = 0,
    failed = 0;
  const ackedUrls: string[] = [];
  for (const rec of records) {
    const r = await deliver(rec, cfg, fetchImpl);
    if (r.ok) {
      ackedUrls.push(rec.url);
      if (r.duplicate) duplicate++;
      else delivered++;
    } else {
      failed++;
    }
  }
  if (ackedUrls.length) await buffer.remove(ackedUrls);
  return { delivered, duplicate, failed };
}
