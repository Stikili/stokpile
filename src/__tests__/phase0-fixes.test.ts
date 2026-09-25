import { describe, it, expect } from 'vitest';
import { hasRotation } from '@/domain/types';
import { readPaymentReturn } from '@/presentation/components/contributions/PaymentReturnDialog';

describe('hasRotation', () => {
  it.each(['rotating', 'susu', 'tontine', 'chama'])('is true for %s', (type) => {
    expect(hasRotation(type)).toBe(true);
  });

  it.each(['burial', 'grocery', 'investment', 'vsla', 'goal', '', null, undefined])('is false for %s', (type) => {
    expect(hasRotation(type)).toBe(false);
  });
});

describe('readPaymentReturn', () => {
  it('ignores URLs that are not a payment return', () => {
    expect(readPaymentReturn('')).toBeNull();
    expect(readPaymentReturn('?billing=success')).toBeNull();
  });

  it('trusts the provider status over our own payment=success', () => {
    expect(readPaymentReturn('?payment=success&status=cancelled')?.outcome).toBe('failed');
    expect(readPaymentReturn('?payment=success&status=failed')?.outcome).toBe('failed');
    expect(readPaymentReturn('?payment=success&status=successful')?.outcome).toBe('success');
    expect(readPaymentReturn('?payment=success&status=completed')?.outcome).toBe('success');
  });

  it('falls back to payment= when the provider sends no status', () => {
    expect(readPaymentReturn('?payment=success')?.outcome).toBe('success');
    expect(readPaymentReturn('?payment=failed')?.outcome).toBe('failed');
  });

  it('carries the provider reference', () => {
    expect(readPaymentReturn('?payment=success&status=successful&tx_ref=stokpile-fw-abc')?.reference)
      .toBe('stokpile-fw-abc');
  });
});
