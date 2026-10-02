import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDateTime,
  formatRelativeTime,
} from '../utils/formatters';

describe('Financial Formatters Suite', () => {
  it('formats INR currency with Indian numbering system', () => {
    const formatted = formatCurrency(1234567, 'INR');
    expect(formatted).toContain('₹');
    expect(formatted).toContain('12,34,567');
  });

  it('formats USD currency with standard thousand separators', () => {
    const formatted = formatCurrency(1234567, 'USD');
    expect(formatted).toBe('$1,234,567');
  });

  it('formats EUR currency with symbol', () => {
    const formatted = formatCurrency(5000, 'EUR');
    expect(formatted).toContain('€');
  });

  it('formats GBP currency with symbol', () => {
    const formatted = formatCurrency(250.75, 'GBP');
    expect(formatted).toBe('£250.75');
  });

  it('handles zero and nullish amounts safely', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0');
    expect(formatCurrency(NaN, 'USD')).toBe('$0');
  });

  it('formats percentages correctly with or without decimal ratio flag', () => {
    expect(formatPercent(0.8542, true)).toBe('85.4%');
    expect(formatPercent(85.42, false)).toBe('85.4%');
    expect(formatPercent(0, true)).toBe('0.0%');
  });

  it('formats integer and decimal numbers with localized commas', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(42.5, 1)).toBe('42.5');
    expect(formatNumber(0)).toBe('0');
  });

  it('formats ISO timestamps into human-readable strings', () => {
    const isoString = '2026-09-24T14:30:00Z';
    const formatted = formatDateTime(isoString);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).not.toBe('—');
  });

  it('formats relative times gracefully', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
    expect(formatRelativeTime('')).toBe('—');
  });
});
