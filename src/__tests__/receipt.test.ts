import { describe, it, expect, vi } from 'vitest';

// Mock window.open before importing
vi.stubGlobal('window', {
  open: vi.fn(() => ({
    document: { write: vi.fn(), close: vi.fn() },
    focus: vi.fn(),
    print: vi.fn(),
  })),
});

// Dynamic import after mocks
const { printReceipt } = await import('@/lib/receipt');

describe('printReceipt', () => {
  it('opens a new window with receipt HTML', () => {
    printReceipt({
      receiptNumber: 'ABC12345',
      groupName: 'Test Group',
      memberName: 'Thandi Mokoena',
      memberEmail: 'thandi@test.com',
      amount: 500,
      date: '2026-04-11',
    });

    expect(window.open).toHaveBeenCalledWith('', '_blank', 'width=600,height=800');
  });
});
