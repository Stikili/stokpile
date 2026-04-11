import { describe, it, expect } from 'vitest';
import { whatsappShareUrl } from '@/lib/whatsapp';

describe('whatsappShareUrl', () => {
  it('generates a generic share URL without phone', () => {
    const url = whatsappShareUrl('Hello world');
    expect(url).toBe('https://wa.me/?text=Hello%20world');
  });

  it('generates a direct message URL with phone', () => {
    const url = whatsappShareUrl('Hello', '+27821234567');
    expect(url).toBe('https://wa.me/27821234567?text=Hello');
  });

  it('strips non-numeric characters from phone', () => {
    const url = whatsappShareUrl('Hi', '+27 82 123 4567');
    expect(url).toBe('https://wa.me/27821234567?text=Hi');
  });

  it('encodes special characters in text', () => {
    const url = whatsappShareUrl('Hello & goodbye');
    expect(url).toContain('Hello%20%26%20goodbye');
  });
});
