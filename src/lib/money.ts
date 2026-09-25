/**
 * Stokpile — money formatting (design kit v2).
 * One function. Every amount in the product goes through it.
 *
 * Amounts arrive in rands (the database stores NUMERIC(14,2)); arithmetic is
 * done in whole cents so nothing drifts. Currency is a property of the
 * GROUP: a South African stokvel reads "R 1 200" with narrow-space
 * thousands, a Kenyan chama "KSh 18,000" with commas.
 */
import { COUNTRY_LOCALES } from './locale';
import { activeCurrencyCode } from './export';

const NARROW_NBSP = ' ';
const NBSP = ' ';
const MINUS = '−';

/** Rand-area currencies group thousands with a narrow space; the rest use commas. */
const SPACE_GROUPED = new Set(['ZAR', 'NAD', 'LSL', 'SZL', 'BWP']);

export interface MoneyOptions {
  /** ISO currency code. Defaults to the selected group's currency. */
  currency?: string;
  /** Show cents. Default false: ledgers read in whole units. */
  decimals?: boolean;
  /** Always show + / − (for ledger in/out). Default false: only − shows. */
  sign?: boolean;
}

/** Whole cents from a rand amount, rounded half away from zero. */
export function toCents(amount: number): number {
  return Math.sign(amount) * Math.round(Math.abs(amount) * 100);
}

export function currencySymbolFor(code: string): string {
  const hit = Object.values(COUNTRY_LOCALES).find((l) => l.currency === code);
  return hit?.currencySymbol ?? code;
}

export function money(amount: number, opts: MoneyOptions = {}): string {
  const { decimals = false, sign = false } = opts;
  const code = opts.currency ?? activeCurrencyCode();
  const cents = toCents(Number.isFinite(amount) ? amount : 0);

  const whole = Math.floor(Math.abs(cents) / 100);
  const frac = String(Math.abs(cents) % 100).padStart(2, '0');
  const separator = SPACE_GROUPED.has(code) ? NARROW_NBSP : ',';
  let body = String(decimals ? whole : Math.round(Math.abs(cents) / 100))
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  if (decimals) body += `.${frac}`;

  const symbol = currencySymbolFor(code);
  const prefix = sign ? (cents < 0 ? MINUS : cents > 0 ? '+' : '') : cents < 0 ? MINUS : '';
  const gap = symbol.length > 1 || decimals ? NBSP : '';
  return `${prefix}${symbol}${gap}${body}`;
}

/** Receipt reference: STK-MMYY-NNNN. Stable, short, quotable over the phone. */
export function receiptRef(seq: number, on: Date = new Date()): string {
  const mm = String(on.getMonth() + 1).padStart(2, '0');
  const yy = String(on.getFullYear()).slice(-2);
  return `STK-${mm}${yy}-${String(seq).padStart(4, '0')}`;
}
