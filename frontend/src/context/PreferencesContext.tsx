import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedCurrency, formatCurrency as formatCurrencyUtil } from '../utils/formatters';

interface PreferencesContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
  riskThreshold: number;
  setRiskThreshold: (val: number) => void;
  autoRefreshInterval: number; // in seconds, 0 = off
  setAutoRefreshInterval: (seconds: number) => void;
  formatAmount: (amt: number | null | undefined) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('fraudguard_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light'; // Default to warm editorial light look from reference design
  });

  // Currency state (defaults to INR as per prompt)
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    const saved = localStorage.getItem('fraudguard_currency');
    if (saved === 'INR' || saved === 'USD' || saved === 'EUR' || saved === 'GBP') {
      return saved as SupportedCurrency;
    }
    return 'INR';
  });

  // Risk Threshold
  const [riskThreshold, setRiskThresholdState] = useState<number>(() => {
    const saved = localStorage.getItem('fraudguard_risk_threshold');
    return saved ? parseInt(saved, 10) : 75;
  });

  // Auto Refresh Interval (seconds)
  const [autoRefreshInterval, setAutoRefreshIntervalState] = useState<number>(() => {
    const saved = localStorage.getItem('fraudguard_auto_refresh');
    return saved ? parseInt(saved, 10) : 30;
  });

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('fraudguard_theme', theme);
  }, [theme]);

  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setCurrency = (c: SupportedCurrency) => {
    setCurrencyState(c);
    localStorage.setItem('fraudguard_currency', c);
  };

  const setRiskThreshold = (val: number) => {
    setRiskThresholdState(val);
    localStorage.setItem('fraudguard_risk_threshold', val.toString());
  };

  const setAutoRefreshInterval = (sec: number) => {
    setAutoRefreshIntervalState(sec);
    localStorage.setItem('fraudguard_auto_refresh', sec.toString());
  };

  const formatAmount = (amt: number | null | undefined): string => {
    return formatCurrencyUtil(amt, currency);
  };

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        currency,
        setCurrency,
        riskThreshold,
        setRiskThreshold,
        autoRefreshInterval,
        setAutoRefreshInterval,
        formatAmount,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
