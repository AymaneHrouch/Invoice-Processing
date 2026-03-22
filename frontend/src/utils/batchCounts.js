/**
 * Compute batch action counts from a list of selected invoices.
 * Pure function — no side effects, no API calls.
 * @param {Array} selectedInvoices - Invoice objects currently selected
 * @returns {Object} Count for each possible batch action
 */
export function computeBatchCounts(selectedInvoices) {
  return {
    canValidate: selectedInvoices.filter((inv) =>
      ['extracted', 'draft'].includes(inv.status),
    ).length,
    canInvalidate: selectedInvoices.filter(
      (inv) => !['extracted', 'draft'].includes(inv.status),
    ).length,
    canMarkPaid: selectedInvoices.filter(
      (inv) => !inv.is_paid && ['validated', 'sent'].includes(inv.status),
    ).length,
    canUnmarkPaid: selectedInvoices.filter((inv) => inv.is_paid).length,
    canMarkSent: selectedInvoices.filter(
      (inv) => inv.direction === 'outgoing' && inv.status === 'validated',
    ).length,
    canUnmarkSent: selectedInvoices.filter(
      (inv) => inv.direction === 'outgoing' && inv.status === 'sent',
    ).length,
    canArchive: selectedInvoices.filter((inv) => !inv.is_archived).length,
    canRestore: selectedInvoices.filter((inv) => inv.is_archived).length,
    canMarkExported: selectedInvoices.filter((inv) => !inv.is_exported).length,
    canUnmarkExported: selectedInvoices.filter((inv) => inv.is_exported).length,
    canSetIncoming: selectedInvoices.filter(
      (inv) => inv.direction !== 'incoming',
    ).length,
    canSetOutgoing: selectedInvoices.filter(
      (inv) => inv.direction !== 'outgoing',
    ).length,
  };
}
