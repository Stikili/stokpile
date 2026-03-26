/**
 * Validate and constrain monetary input values.
 * Ensures amounts are positive, finite, and within reasonable bounds.
 */
export function sanitizeAmount(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Please enter a valid amount.');
  }
  if (num < 0) {
    throw new Error('Amount cannot be negative.');
  }
  if (num > 999_999_999) {
    throw new Error('Amount exceeds maximum allowed value.');
  }

  // Round to 2 decimal places to avoid floating point issues
  return Math.round(num * 100) / 100;
}

/**
 * Sanitize a string for safe display.
 * React already escapes JSX expressions, but this is useful for
 * data going to APIs or used in non-JSX contexts.
 */
export function sanitizeString(input: string, maxLength = 10000): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Validate email format (basic check)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
