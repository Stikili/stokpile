import type { CSSProperties, ReactNode } from 'react';

/** Above this many members the rail stops being readable; collapse to a meter. */
const MAX_TICKS = 32;

/**
 * Cycle rail — the group's position in its own rotation, shown before any
 * number. One tick per member: done · now · upcoming.
 *
 * Motion: the one orchestrated moment in the product. Ticks land left to
 * right, staggered by --m-stagger (each tick carries --i), then the app is
 * still. prefers-reduced-motion renders it filled.
 */
export function CycleRail({
  members,
  round,
  animate = true,
  label,
}: {
  members: number;
  /** 1-indexed. */
  round: number;
  animate?: boolean;
  /** Accessible summary, e.g. "Round 7 of 10". */
  label?: string;
}) {
  const aria = label ?? `Round ${round} of ${members}`;

  if (members > MAX_TICKS) {
    const pct = Math.min(100, Math.max(0, ((round - 1) / members) * 100));
    return (
      <div className="meter" role="img" aria-label={aria}>
        <i className="meter__fill" style={{ width: `${pct}%` }} />
      </div>
    );
  }

  const nodes: ReactNode[] = [];
  let i = 0;
  for (let m = 0; m < members; m++) {
    const done = m < round - 1;
    const now = m === round - 1;
    nodes.push(
      <b
        key={`t${m}`}
        className={`rail__tick${done ? ' rail__tick--done' : ''}${now ? ' rail__tick--now' : ''}`}
        style={{ '--i': i++ } as CSSProperties}
      />,
    );
    if (m < members - 1) {
      nodes.push(
        <i
          key={`l${m}`}
          className={`rail__link${done ? ' rail__link--done' : ''}`}
          style={{ '--i': i++ } as CSSProperties}
        />,
      );
    }
  }

  return (
    <div className={`rail${animate ? ' rail--animate' : ''}`} role="img" aria-label={aria}>
      {nodes}
    </div>
  );
}
