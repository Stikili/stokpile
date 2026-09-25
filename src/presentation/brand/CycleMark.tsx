import type { CSSProperties } from 'react';

/**
 * Stokpile — the brand mark.
 *
 * The mark IS the rotation: one tick per member, heavy tick = the live round.
 * It is the same primitive as <CycleRail>, drawn in a ring. Because it reads
 * from real group state, a group in month nine sees a different mark from a
 * group in month two.
 *
 * Reduction: >24px use every tick; 16-24px pass `reduce` to drop to six;
 * below 16px use the heavy tick alone in a filled square (see brand/ assets).
 *
 * Clear space: one tick-length on every side. Never in a circle, never a
 * gradient, never outlined.
 */
export function CycleMark({
  members = 10,
  round = 7,
  size = 32,
  reduce = false,
  title,
  style,
}: {
  /** Total members = total ticks. */
  members?: number;
  /** 1-indexed current round. */
  round?: number;
  size?: number;
  /** Collapse to six ticks for small sizes. */
  reduce?: boolean;
  /** Accessible name. Omit for decorative use. */
  title?: string;
  style?: CSSProperties;
}) {
  const n = reduce ? 6 : Math.max(3, members);
  const now = reduce ? 3 : Math.min(Math.max(round - 1, 0), n - 1);
  const C = 24;

  const ticks = Array.from({ length: n }, (_, i) => {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    const live = i === now;
    const [r1, r2, w] = live
      ? reduce ? [10.0, 21.0, 6.4] : [10.2, 20.8, 5.0]
      : reduce ? [12.5, 19.0, 4.6] : [13.0, 18.6, 3.2];
    return {
      key: i,
      x1: C + r1 * Math.cos(a), y1: C + r1 * Math.sin(a),
      x2: C + r2 * Math.cos(a), y2: C + r2 * Math.sin(a),
      w, opacity: i <= now ? 1 : 0.3,
    };
  });

  return (
    <svg
      viewBox="0 0 48 48" width={size} height={size} fill="none" style={style}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <g stroke="currentColor" strokeLinecap="round">
        {ticks.map(t => (
          <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                strokeWidth={t.w} opacity={t.opacity} />
        ))}
      </g>
    </svg>
  );
}

/** Primary lockup: mark + lowercase wordmark. The only approved pairing. */
export function Lockup({ size = 32, members = 10, round = 7 }: { size?: number; members?: number; round?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32, color: 'var(--s-brand)' }}>
      <CycleMark size={size} members={members} round={round} title="Stokpile" />
      <span className="t-wordmark" style={{ fontSize: size * 0.82 }}>stokpile</span>
    </span>
  );
}
