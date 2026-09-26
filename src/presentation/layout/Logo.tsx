import { CycleMark } from '@/presentation/brand/CycleMark';

interface LogoProps {
  className?: string;
  showText?: boolean;
  /** Mark size in px; the wordmark scales with it. */
  size?: number;
}

/**
 * Brand lockup: the cycle mark plus the lowercase wordmark — the only
 * approved pairing. Colour comes from the brand token so it follows the theme.
 */
export function Logo({ className = '', showText = true, size = 32 }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center text-[var(--s-brand)] ${className}`}
      style={{ gap: size * 0.3 }}
    >
      <CycleMark size={size} title={showText ? undefined : 'Stokpile'} />
      {showText && (
        <span className="t-wordmark leading-none" style={{ fontSize: size * 0.78 }}>
          stokpile
        </span>
      )}
    </span>
  );
}
