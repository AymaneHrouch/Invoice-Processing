import { describe, test, expect } from 'vitest';
import {
  calculateItemTotal,
  calculateInvoiceTotal,
  runAmountChecks,
} from '../invoiceCalculations';

// ---------------------------------------------------------------------------
// calculateItemTotal
// ---------------------------------------------------------------------------

describe('calculateItemTotal', () => {
  test('multiplies quantity by unit price', () => {
    expect(calculateItemTotal(3, 100)).toBe('300.00');
  });

  test('returns 0.00 for zero quantity', () => {
    expect(calculateItemTotal(0, 500)).toBe('0.00');
  });

  test('returns 0.00 for non-numeric quantity', () => {
    expect(calculateItemTotal('abc', 100)).toBe('0.00');
  });

  test('returns 0.00 for non-numeric price', () => {
    expect(calculateItemTotal(3, 'xyz')).toBe('0.00');
  });

  test('handles decimal inputs', () => {
    expect(calculateItemTotal(2.5, 40)).toBe('100.00');
  });

  test('handles string numbers', () => {
    expect(calculateItemTotal('2', '50')).toBe('100.00');
  });
});

// ---------------------------------------------------------------------------
// calculateInvoiceTotal
// ---------------------------------------------------------------------------

describe('calculateInvoiceTotal', () => {
  test('returns 0 for empty items array', () => {
    expect(parseFloat(calculateInvoiceTotal([]))).toBe(0);
  });

  test('sums multiple items', () => {
    const items = [
      { quantity: 2, unit_price: 100 },
      { quantity: 1, unit_price: 200 },
    ];
    expect(parseFloat(calculateInvoiceTotal(items))).toBeCloseTo(400);
  });

  test('handles single item', () => {
    const items = [{ quantity: 5, unit_price: 30 }];
    expect(parseFloat(calculateInvoiceTotal(items))).toBeCloseTo(150);
  });
});

// ---------------------------------------------------------------------------
// runAmountChecks
// ---------------------------------------------------------------------------

describe('runAmountChecks', () => {
  test('returns empty array when no issues', () => {
    const invoice = {
      total_amount: 300,
      items: [{ quantity: 3, unit_price: 100, total: 300, description: 'Service' }],
    };
    expect(runAmountChecks(invoice)).toEqual([]);
  });

  test('warns when line item math is wrong', () => {
    const invoice = {
      total_amount: 500,
      items: [{ quantity: 2, unit_price: 100, total: 300, description: 'Service A' }],
    };
    const warnings = runAmountChecks(invoice);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/expected 200\.00/);
    expect(warnings[0]).toMatch(/found 300\.00/);
  });

  test('warns when sum of lines differs from total_amount', () => {
    const invoice = {
      total_amount: 999,
      items: [{ quantity: 1, unit_price: 100, total: 100, description: 'Item' }],
    };
    const warnings = runAmountChecks(invoice);
    expect(warnings.some((w) => w.includes('≠'))).toBe(true);
  });

  test('returns empty array for null invoice (no crash)', () => {
    expect(runAmountChecks(null)).toEqual([]);
  });

  test('returns empty array for invoice with no items', () => {
    const invoice = { total_amount: 0, items: [] };
    expect(runAmountChecks(invoice)).toEqual([]);
  });

  test('uses MAD as default currency', () => {
    const invoice = {
      total_amount: 999,
      items: [{ quantity: 1, unit_price: 100, total: 100, description: 'Item' }],
    };
    const warnings = runAmountChecks(invoice);
    const sumWarning = warnings.find((w) => w.includes('≠'));
    expect(sumWarning).toMatch(/MAD/);
  });

  test('uses provided currency in sum warning', () => {
    const invoice = {
      total_amount: 999,
      items: [{ quantity: 1, unit_price: 100, total: 100, description: 'Item' }],
    };
    const warnings = runAmountChecks(invoice, 'EUR');
    const sumWarning = warnings.find((w) => w.includes('≠'));
    expect(sumWarning).toMatch(/EUR/);
  });
});
