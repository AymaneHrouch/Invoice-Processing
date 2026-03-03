export const calculateItemTotal = (quantity, unitPrice) => {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  return (qty * price).toFixed(2);
};

export const calculateInvoiceTotal = (items) => {
  return items
    .reduce((total, item) => {
      return (
        total +
        (parseFloat(calculateItemTotal(item.quantity, item.unit_price)) || 0)
      );
    }, 0)
    .toFixed(2);
};

/**
 * Run amount verification checks. Returns warnings for extracted invoices.
 * Only relevant when status === 'extracted' — validated invoices skip these.
 * @param {{ total_amount: number|string, items: Array<{quantity, unit_price, total, description}> }} invoice
 * @param {string} [currency] - For display in messages
 * @returns {string[]} List of warning messages
 */
export const runAmountChecks = (invoice, currency = 'MAD') => {
  const warnings = [];
  const items = invoice?.items || [];
  const totalAmount = parseFloat(invoice?.total_amount) || 0;

  // Check 1 — line item math: quantity * unit_price vs item.total
  items.forEach((item, idx) => {
    const qty = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const expected = Math.round(qty * unitPrice * 100) / 100;
    const found = parseFloat(item.total) || 0;
    if (Math.abs(expected - found) > 0.01) {
      const desc = item.description || item.name || `Item ${idx + 1}`;
      warnings.push(`Line '${desc}': expected ${expected.toFixed(2)}, found ${found.toFixed(2)}`);
    }
  });

  // Check 2 — global totals: sum of items vs total_amount
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
