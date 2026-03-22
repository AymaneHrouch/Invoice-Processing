/**
 * Calculate TTC total for a single item.
 * @param {number|string} quantity
 * @param {number|string} unitPrice
 * @param {number|string} [tvaRate=0] - TVA rate as percentage (e.g. 20 for 20%)
 * @returns {string} TTC amount rounded to 2 decimal places
 */
export const calculateItemTotal = (quantity, unitPrice, tvaRate = 0) => {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const tva = parseFloat(tvaRate) || 0;
  return (qty * price * (1 + tva / 100)).toFixed(2);
};

/**
 * Compute invoice-level totals from items array.
 * Items must have quantity, unit_price, tva, and tva_amount (or tva for computation).
 * @param {Array} items
 * @returns {{ subtotalHT: number, amountTva: number, totalTTC: number }}
 */
export const calculateInvoiceTotals = (items) => {
  let subtotalHT = 0;
  let amountTva = 0;
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    subtotalHT += qty * price;
    amountTva += parseFloat(item.tva_amount) || 0;
  }
  return {
    subtotalHT: Math.round(subtotalHT * 100) / 100,
    amountTva: Math.round(amountTva * 100) / 100,
    totalTTC: Math.round((subtotalHT + amountTva) * 100) / 100,
  };
};

/**
 * @deprecated Use calculateInvoiceTotals instead.
 * Kept for backward compatibility with existing callers.
 */
export const calculateInvoiceTotal = (items) => {
  return items
    .reduce((total, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const tva = parseFloat(item.tva) || 0;
      return total + qty * price * (1 + tva / 100);
    }, 0)
    .toFixed(2);
};

/**
 * Run amount verification checks. Returns warnings for extracted invoices.
 * Check 1: qty × unit_price × (1 + tva/100) == item.total (TTC)
 * Check 2: sum(item.total) == total_amount
 * @param {{ total_amount: number|string, tva?: number, items: Array }} invoice
 * @param {string} [currency]
 * @returns {string[]}
 */
export const runAmountChecks = (invoice, currency = 'MAD') => {
  const warnings = [];
  const items = invoice?.items || [];
  const totalAmount = parseFloat(invoice?.total_amount) || 0;
  const invoiceTva = parseFloat(invoice?.tva) || 0;

  // Check 1 — per-item TTC: qty × unit_price × (1 + tva/100) vs item.total
  items.forEach((item, idx) => {
    const qty = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    // Fall back to invoice-level tva for legacy items with tva=0
    const itemTva = parseFloat(item.tva) || invoiceTva;
    const expected = Math.round(qty * unitPrice * (1 + itemTva / 100) * 100) / 100;
    const found = parseFloat(item.total) || 0;
    if (Math.abs(expected - found) > 0.01) {
      const desc = item.description || item.name || `Item ${idx + 1}`;
      warnings.push(`Line '${desc}': expected ${expected.toFixed(2)} TTC, found ${found.toFixed(2)}`);
    }
  });

  // Check 2 — sum of item totals (TTC) vs total_amount
  if (items.length > 0) {
    const sumItems = Math.round(
      items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0) * 100
    ) / 100;
    if (Math.abs(sumItems - totalAmount) > 0.01) {
      warnings.push(
        `Sum of lines (${sumItems.toFixed(2)} ${currency}) ≠ Total amount (${totalAmount.toFixed(2)} ${currency})`
      );
    }
  }

  return warnings;
};
