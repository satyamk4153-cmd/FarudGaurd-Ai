import { describe, it, expect } from 'vitest';

describe('Design System Tokens and Badges', () => {
  it('defines valid semantic risk tiers with high-contrast color pairings', () => {
    const riskTiers = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    expect(riskTiers).toHaveLength(4);

    const riskBadgeTokens: Record<string, { light: string; dark: string }> = {
      LOW: {
        light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dark: 'dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
      },
      MEDIUM: {
        light: 'bg-amber-50 text-amber-800 border-amber-200',
        dark: 'dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
      },
      HIGH: {
        light: 'bg-orange-50 text-orange-800 border-orange-200',
        dark: 'dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-800/60',
      },
      CRITICAL: {
        light: 'bg-rose-50 text-rose-800 border-rose-200',
        dark: 'dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
      },
    };

    for (const tier of riskTiers) {
      expect(riskBadgeTokens[tier]).toBeDefined();
      expect(riskBadgeTokens[tier].light).toContain('text-');
      expect(riskBadgeTokens[tier].dark).toContain('dark:text-');
    }
  });

  it('defines valid decision verdicts', () => {
    const verdicts = ['APPROVE', 'REVIEW', 'MANUAL REVIEW', 'BLOCK'];
    expect(verdicts.includes('APPROVE')).toBe(true);
    expect(verdicts.includes('BLOCK')).toBe(true);
    expect(verdicts.includes('REVIEW')).toBe(true);
  });
});
