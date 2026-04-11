import { describe, it, expect } from 'vitest';
import { generateConstitution } from '@/lib/constitutionTemplate';

describe('generateConstitution', () => {
  it('generates a markdown document', () => {
    const result = generateConstitution({
      groupName: 'Test Stokvel',
      groupType: 'rotating',
    });
    expect(result).toContain('# CONSTITUTION OF TEST STOKVEL');
    expect(result).toContain('Rotating Stokvel');
  });

  it('includes contribution amount when provided', () => {
    const result = generateConstitution({
      groupName: 'My Group',
      groupType: 'burial',
      contributionAmount: 500,
    });
    expect(result).toContain('500');
    expect(result).toContain('Burial Society');
  });

  it('includes all 10 sections', () => {
    const result = generateConstitution({
      groupName: 'Test',
      groupType: 'rotating',
    });
    expect(result).toContain('## 1. NAME AND PURPOSE');
    expect(result).toContain('## 2. MEMBERSHIP');
    expect(result).toContain('## 3. CONTRIBUTIONS');
    expect(result).toContain('## 4. PAYOUTS');
    expect(result).toContain('## 5. MEETINGS');
    expect(result).toContain('## 6. ROLES AND RESPONSIBILITIES');
    expect(result).toContain('## 7. CONFLICT RESOLUTION');
    expect(result).toContain('## 8. DISSOLUTION');
    expect(result).toContain('## 9. AMENDMENTS');
    expect(result).toContain('## 10. SIGNATURES');
  });

  it('includes founder name when provided', () => {
    const result = generateConstitution({
      groupName: 'Test',
      groupType: 'rotating',
      founderName: 'Thandi Mokoena',
    });
    expect(result).toContain('Thandi Mokoena');
  });

  it('handles all group types', () => {
    const types = ['rotating', 'burial', 'grocery', 'investment', 'chama', 'susu', 'tontine', 'vsla', 'goal'];
    for (const t of types) {
      const result = generateConstitution({ groupName: 'Test', groupType: t });
      expect(result.length).toBeGreaterThan(500);
    }
  });
});
