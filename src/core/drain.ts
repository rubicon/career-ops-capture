import type { CaptureBuffer } from "./buffer";
import { deliver, type DeliveryConfig, type FetchImpl } from "./delivery";

// Delivers each buffered record; removes a url from the buffer only on a
// successful ack, so failed records survive for the retry alarm. Pure (fetch +
// buffer injected). Per-record ack means a partial batch never double-sends.
export interface DrainResult {
  delivered: number;
  duplicate: number;
  failed: number;
  // The first failure's reason, carried out so the popup can show why nothing
  // arrived. A drain that fails silently is what let a broken contract look like a
  // working one for as long as it did.
  error?: string;
}

export async function drainBuffer(
  buffer: CaptureBuffer,
  cfg: DeliveryConfig,
  fetchImpl: FetchImpl,
): Promise<DrainResult> {
  const records = await buffer.list();
  let delivered = 0,
    duplicate = 0,
    failed = 0;
  let error: string | undefined;
  const ackedUrls: string[] = [];
  for (const rec of records) {
    const r = await deliver(rec, cfg, fetchImpl);
    if (r.ok) {
      ackedUrls.push(rec.url);
      if (r.duplicate) duplicate++;
      else delivered++;
    } else {
      failed++;
      error ??= r.error;
    }
  }
  if (ackedUrls.length) await buffer.remove(ackedUrls);
  return { delivered, duplicate, failed, error };
}

// What the popup says after a send. It reports the drain's actual outcome, rather
// than announcing success the moment the button is clicked.
export function describeDrain(r: DrainResult | null | undefined): string {
  if (!r) return "could not reach the extension background";
  const sent = r.delivered + r.duplicate;
  if (r.failed === 0) return sent === 0 ? "nothing to send" : `sent ${sent}`;
  const why = r.error ? `: ${r.error}` : "";
  if (sent === 0) return `none sent, ${r.failed} kept for retry${why}`;
  return `sent ${sent}, ${r.failed} kept for retry${why}`;
}
