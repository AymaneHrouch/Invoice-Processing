import { describe, test, expect, beforeEach } from 'vitest';
import {
  setAuthToken,
  getAuthToken,
  removeAuthToken,
  replaceAuthToken,
  getAuthConfig,
} from '../auth';

beforeEach(() => {
  localStorage.clear();
});

describe('setAuthToken', () => {
  test('stores token in localStorage', () => {
    setAuthToken('my-token');
    expect(localStorage.getItem('authToken')).toBe('my-token');
  });

  test('does not store null/undefined', () => {
    setAuthToken(null);
    expect(localStorage.getItem('authToken')).toBeNull();
    setAuthToken(undefined);
    expect(localStorage.getItem('authToken')).toBeNull();
  });
});

describe('getAuthToken', () => {
  test('returns null when not set', () => {
    expect(getAuthToken()).toBeNull();
  });

  test('returns stored token', () => {
    localStorage.setItem('authToken', 'abc123');
    expect(getAuthToken()).toBe('abc123');
  });
});

describe('removeAuthToken', () => {
  test('clears the token', () => {
    localStorage.setItem('authToken', 'to-remove');
    removeAuthToken();
    expect(getAuthToken()).toBeNull();
  });
});

describe('replaceAuthToken', () => {
  test('swaps old token for new one', () => {
    setAuthToken('old-token');
    replaceAuthToken('new-token');
    expect(getAuthToken()).toBe('new-token');
  });

  test('sets token even when none existed before', () => {
    replaceAuthToken('brand-new');
    expect(getAuthToken()).toBe('brand-new');
  });
});

describe('getAuthConfig', () => {
  test('returns Bearer header when token is present', () => {
    setAuthToken('secret');
    const config = getAuthConfig();
    expect(config.headers.Authorization).toBe('Bearer secret');
  });

  test('returns empty object when no token', () => {
    const config = getAuthConfig();
    expect(config).toEqual({});
  });
});
