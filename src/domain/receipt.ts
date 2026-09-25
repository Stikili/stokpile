/**
 * Receipt domain — the reference printed on every receipt.
 *
 * Format: STK-MMYY-NNNN. Short, stable, quotable over the phone. NNNN is a
 * per-group sequence number; until the stored counter exists, callers pass a
 * short code derived from the record id (see receiptRefFromId).
 */
export function receiptRef(seq: number, on: Date = new Date()): string {
  return `STK-${monthYear(on)}-${String(seq).padStart(4, '0')}`;
}

/** Interim reference from a record id: STK-MMYY-XXXX (first 4 hex chars). */
export function receiptRefFromId(id: string, on: Date): string {
  const code = id.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase().padEnd(4, '0');
  return `STK-${monthYear(on)}-${code}`;
}

function monthYear(on: Date): string {
  return `${String(on.getMonth() + 1).padStart(2, '0')}${String(on.getFullYear()).slice(-2)}`;
}
