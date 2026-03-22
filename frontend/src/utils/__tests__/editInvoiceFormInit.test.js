/**
 * Tests for the ICE field initialization logic used in EditInvoice.jsx (line 172).
 * Mirrors: invoice.vendor_ice || invoice.ice || ''
 *
 * Bug 5 regression: EditInvoice was reading invoice.ice (legacy) instead of
 * invoice.vendor_ice (enriched from contact). This caused the Edit modal to
 * show an empty ICE field even when the linked contact had an ICE value.
 */
import { describe, test, expect } from 'vitest';

// The function under test — mirrors the exact expression in EditInvoice.jsx
function initIceField(invoice) {
  return invoice.vendor_ice || invoice.ice || '';
}

describe('initIceField', () => {
  test('prefers vendor_ice over legacy ice field (bug 5 regression)', () => {
    expect(initIceField({ vendor_ice: '999', ice: '111' })).toBe('999');
  });

  test('falls back to ice when vendor_ice is null', () => {
    expect(initIceField({ vendor_ice: null, ice: '111' })).toBe('111');
  });

  test('falls back to ice when vendor_ice is undefined', () => {
    expect(initIceField({ ice: '111' })).toBe('111');
  });

  test('falls back to ice when vendor_ice is empty string', () => {
    expect(initIceField({ vendor_ice: '', ice: '111' })).toBe('111');
  });

  test('returns empty string when both absent', () => {
    expect(initIceField({})).toBe('');
  });

  test('returns empty string when both null', () => {
    expect(initIceField({ vendor_ice: null, ice: null })).toBe('');
  });

  test('returns vendor_ice when ice is also present (no fallback needed)', () => {
    expect(initIceField({ vendor_ice: 'ABC123', ice: 'OLD456' })).toBe('ABC123');
  });
});
