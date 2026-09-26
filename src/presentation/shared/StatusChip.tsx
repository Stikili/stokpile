import type { ReactNode } from 'react';

/**
 * Status chip (design kit v2). Colour NEVER carries state alone: every chip
 * pairs a hue with a shape and a word, so it survives colour-blindness, a
 * printed minute book, and a cheap screen in sunlight.
 *
 *   paid   — dot, brand       (done, approved, received)
 *   late   — square, warn     (LATE only — never a generic highlight)
 *   due    — ring, muted      (waiting, pending, scheduled)
 *   bad    — bar, bad         (rejected, cancelled, failed, disputed)
 *   payout — brand inverted   (money released)
 *   role   — outline, mono    (treasurer, chair…)
 */
export type ChipTone = 'paid' | 'late' | 'due' | 'bad' | 'payout' | 'role';

interface StatusChipProps {
  tone: ChipTone;
  label: string;
  /** Trailing adornment, e.g. a chevron on a tappable chip. */
  children?: ReactNode;
  className?: string;
}

export function StatusChip({ tone, label, children, className = '' }: StatusChipProps) {
  return (
    <span className={`chip chip--${tone} ${className}`}>
      {tone !== 'role' && <span className="chip__mark" aria-hidden="true" />}
      {label}
      {children}
    </span>
  );
}

/** Payout lifecycle → chip. */
export const PAYOUT_CHIP: Record<string, { tone: ChipTone; label: string }> = {
  scheduled:             { tone: 'due',    label: 'Scheduled' },
  processing:            { tone: 'paid',   label: 'Processing' },
  awaiting_confirmation: { tone: 'due',    label: 'Awaiting confirmation' },
  completed:             { tone: 'payout', label: 'Paid out' },
  cancelled:             { tone: 'bad',    label: 'Cancelled' },
  disputed:              { tone: 'bad',    label: 'Disputed' },
};

export function payoutChip(status: string) {
  return PAYOUT_CHIP[status] ?? PAYOUT_CHIP.scheduled;
}
