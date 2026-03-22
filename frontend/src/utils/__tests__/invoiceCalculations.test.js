import { describe, test, expect } from 'vitest';
import {
  calculateItemTotal,
  calculateInvoiceTotals,
  calculateInvoiceTotal,
  runAmountChecks,
} from '../invoiceCalculations';

// ---------------------------------------------------------------------------
// calculateItemTotal — now supports tvaRate (TTC)
// ---------------------------------------------------------------------------

describe('calculateItemTotal', () => {
  test('without TVA: qty × price (tva=0)', () => {
    expect(calculateItemTotal(3, 100)).toBe('300.00');
  });

  test('with TVA 20%: 2 × 100 × 1.20 = 240.00', () => {
    expect(calculateItemTotal(2, 100, 20)).toBe('240.00');
  });

  test('with TVA 0% explicit: no TVA applied', () => {
    expect(calculateItemTotal(3, 100, 0)).toBe('300.00');
  });

  test('returns 0.00 for zero quantity', () => {
    expect(calculateItemTotal(0, 500, 20)).toBe('0.00');
  });

  test('returns 0.00 for non-numeric quantity', () => {
    expect(calculateItemTotal('abc', 100, 20)).toBe('0.00');
  });

  test('returns 0.00 for non-numeric price', () => {
    expect(calculateItemTotal(3, 'xyz', 20)).toBe('0.00');
  });

  test('handles decimal inputs with TVA', () => {
    expect(calculateItemTotal(2, 100, 10)).toBe('220.00');
  });

  test('handles string numbers', () => {
    expect(calculateItemTotal('2', '50', '20')).toBe('120.00');
  });
});

// ---------------------------------------------------------------------------
// calculateInvoiceTotals — derives HT, TVA, TTC from items
// ---------------------------------------------------------------------------

describe('calculateInvoiceTotals', () => {
  test('empty items → all zeros', () => {
    const result = calculateInvoiceTotals([]);
    expect(result.subtotalHT).toBe(0);
    expect(result.amountTva).toBe(0);
    expect(result.totalTTC).toBe(0);
  });

  test('single item with 20% TVA', () => {
    const items = [{ quantity: 1, unit_price: 1000, tva: 20, tva_amount: 200, total: 1200 }];
    const result = calculateInvoiceTotals(items);
    expect(result.subtotalHT).toBe(1000);
    expect(result.amountTva).toBe(200);
    expect(result.totalTTC).toBe(1200);
  });

  test('mixed TVA rates: 20% + 10%', () => {
    const items = [
      { quantity: 1, unit_price: 1000, tva: 20, tva_amount: 200, total: 1200 },
      { quantity: 2, unit_price: 500, tva: 10, tva_amount: 100, total: 1100 },
    ];
    const result = calculateInvoiceTotals(items);
    expect(result.subtotalHT).toBe(2000);
    expect(result.amountTva).toBe(300);
    expect(result.totalTTC).toBe(2300);
  });

  test('item with TVA 0%: tva_amount = 0', () => {
    const items = [{ quantity: 5, unit_price: 200, tva: 0, tva_amount: 0, total: 1000 }];
    const result = calculateInvoiceTotals(items);
    expect(result.subtotalHT).toBe(1000);
    expect(result.amountTva).toBe(0);
    expect(result.totalTTC).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// calculateInvoiceTotal (legacy — backward compat)
// ---------------------------------------------------------------------------

describe('calculateInvoiceTotal (legacy)', () => {
  test('returns 0 for empty items array', () => {
    expect(parseFloat(calculateInvoiceTotal([]))).toBe(0);
  });

  test('sums items TTC with per-item tva', () => {
    const items = [
      { quantity: 2, unit_price: 100, tva: 20 },
      { quantity: 1, unit_price: 200, tva: 0 },
    ];
    // 2 × 100 × 1.2 + 1 × 200 × 1.0 = 240 + 200 = 440
    expect(parseFloat(calculateInvoiceTotal(items))).toBeCloseTo(440);
  });
});

// ---------------------------------------------------------------------------
// runAmountChecks — per-item TVA
// ---------------------------------------------------------------------------

describe('runAmountChecks', () => {
  test('no warnings when item total matches TTC and sum matches total_amount', () => {
    const invoice = {
      total_amount: 1200,
      tva: 20,
      items: [{ quantity: 1, unit_price: 1000, tva: 20, total: 1200, description: 'Service' }],
    };
    expect(runAmountChecks(invoice)).toEqual([]);
  });

  test('warns when line item TTC does not match qty × price × (1 + tva/100)', () => {
    const invoice = {
      total_amount: 1200,
      items: [{ quantity: 2, unit_price: 100, tva: 20, total: 300, description: 'Service A' }],
    };
    const warnings = runAmountChecks(invoice);
    expect(warnings.length).toBeGreaterThan(0);
    // 2 × 100 × 1.2 = 240, found 300
    expect(warnings[0]).toMatch(/expected 240\.00 TTC/);
    expect(warnings[0]).toMatch(/found 300\.00/);
  });

  test('warns when sum of item totals differs from total_amount', () => {
    const invoice = {
      total_amount: 999,
      items: [{ quantity: 1, unit_price: 1000, tva: 20, total: 1200, description: 'Item' }],
    };
    const warnings = runAmountChecks(invoice);
    expect(warnings.some((w) => w.includes('≠'))).toBe(true);
  });

  test('falls back to invoice-level tva for items with tva=0 (legacy)', () => {
    const invoice = {
      total_amount: 1200,
      tva: 20,
      items: [{ quantity: 1, unit_price: 1000, tva: 0, total: 1200, description: 'Legacy' }],
    };
    // With fallback: 1 × 1000 × 1.20 = 1200 — no warning
    expect(runAmountChecks(invoice)).toEqual([]);
  });

  test('mixed TVA rates: no warning when correct', () => {
    const invoice = {
      total_amount: 2300,
      items: [
        { quantity: 1, unit_price: 1000, tva: 20, total: 1200, description: 'A' },
        { quantity: 2, unit_price: 500, tva: 10, total: 1100, description: 'B' },
      ],
    };
    expect(runAmountChecks(invoice)).toEqual([]);
  });

  test('returns empty array for null invoice (no crash)', () => {
    expect(runAmountChecks(null)).toEqual([]);
  });

  test('returns empty array for invoice with no items', () => {
    const invoice = { total_amount: 0, items: [] };
    expect(runAmountChecks(invoice)).toEqual([]);
  });

  test('uses provided currency in sum warning', () => {
    const invoice = {
      total_amount: 999,
      items: [{ quantity: 1, unit_price: 100, tva: 0, total: 100, description: 'Item' }],
    };
    const warnings = runAmountChecks(invoice, 'EUR');
    const sumWarning = warnings.find((w) => w.includes('≠'));
    expect(sumWarning).toMatch(/EUR/);
  });
});
