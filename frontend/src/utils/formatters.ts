/**
 * Enterprise Financial Data & Formatting Utilities
 * Handles locale-aware currency, numbers, relative time, and risk helpers.
 */

export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export const CURRENCY_CONFIG: Record<SupportedCurrency, { symbol: string; locale: string; name: string }> = {
  INR: { symbol: '₹', locale: 'en-IN', name: 'Indian Rupee (INR)' },
  USD: { symbol: '$', locale: 'en-US', name: 'US Dollar (USD)' },
  EUR: { symbol: '€', locale: 'de-DE', name: 'Euro (EUR)' },
  GBP: { symbol: '£', locale: 'en-GB', name: 'British Pound (GBP)' },
};

/**
 * Format currency amount with locale-aware thousand separators and currency symbol
 * Uses en-IN for INR (e.g. ₹12,48,320) and en-US for USD.
 */
export function formatCurrency(amount: number | null | undefined, currency: SupportedCurrency = 'INR'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${CURRENCY_CONFIG[currency].symbol}0`;
  }

  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toLocaleString()}`;
  }
}

/**
 * Format standard integers or decimal values with thousands separators
 */
export function formatNumber(val: number | null | undefined, maximumFractionDigits: number = 0): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(val);
}

/**
 * Format percentage values (e.g., 0.142 -> "14.2%" or 14.2 -> "14.2%")
 */
export function formatPercent(val: number | null | undefined, isDecimalRatio: boolean = true, decimals: number = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  const num = isDecimalRatio ? val * 100 : val;
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format ISO datetime string to enterprise readable format
 * e.g., "Sep 24, 2026, 18:30"
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Format relative time (e.g., "3m ago", "2h ago", "yesterday")
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}
