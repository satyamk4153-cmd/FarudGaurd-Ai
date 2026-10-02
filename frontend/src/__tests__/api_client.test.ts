import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Node environment localStorage polyfill for testing
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.setItem) {
  let store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() {
      return Object.keys(store).length;
    },
  } as any;
}

import apiClient, {
  authApi,
  transactionsApi,
  dashboardApi,
  predictionApi,
  investigationsApi,
  alertsApi,
  modelsApi,
  monitoringApi,
  datasetsApi,
  copilotApi,
  adminApi,
} from '../api/client';

describe('Frontend API Client Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('exposes all required fintech enterprise API modules', () => {
    expect(authApi).toBeDefined();
    expect(transactionsApi).toBeDefined();
    expect(dashboardApi).toBeDefined();
    expect(predictionApi).toBeDefined();
    expect(investigationsApi).toBeDefined();
    expect(alertsApi).toBeDefined();
    expect(modelsApi).toBeDefined();
    expect(monitoringApi).toBeDefined();
    expect(datasetsApi).toBeDefined();
    expect(copilotApi).toBeDefined();
    expect(adminApi).toBeDefined();
  });

  it('configures proper baseURL defaults', () => {
    expect(apiClient.defaults.baseURL).toMatch(/(\/api|8000)/);
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('injects Authorization bearer token from localStorage on requests', async () => {
    const fakeToken = 'header.payload.signature';
    localStorage.setItem('fraudguard_token', fakeToken);

    // Call request interceptor directly
    const interceptor = (apiClient.interceptors.request as any).handlers[0];
    const config = await interceptor.fulfilled({ headers: {} });

    expect(config.headers.Authorization).toBe(`Bearer ${fakeToken}`);
  });

  it('handles requests gracefully without token', async () => {
    const interceptor = (apiClient.interceptors.request as any).handlers[0];
    const config = await interceptor.fulfilled({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });
});
