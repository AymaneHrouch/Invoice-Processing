import { describe, test, expect } from 'vitest';
import { computeBatchCounts } from '../batchCounts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inv(overrides) {
  return {
    status: 'extracted',
    is_paid: false,
    is_archived: false,
    is_exported: false,
    direction: 'incoming',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// canMarkPaid
// ---------------------------------------------------------------------------

describe('canMarkPaid', () => {
  test('counts validated invoice with is_paid=false (bug 7 regression)', () => {
    const counts = computeBatchCounts([inv({ status: 'validated', is_paid: false })]);
    expect(counts.canMarkPaid).toBe(1);
  });

  test('counts sent invoice with is_paid=false', () => {
    const counts = computeBatchCounts([inv({ status: 'sent', is_paid: false })]);
    expect(counts.canMarkPaid).toBe(1);
  });

  test('does not count draft invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'draft', is_paid: false })]);
    expect(counts.canMarkPaid).toBe(0);
  });

  test('does not count extracted invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'extracted', is_paid: false })]);
    expect(counts.canMarkPaid).toBe(0);
  });

  // Bug 7 + Bug 2 regression: inconsistent doc (is_paid=true, status=validated)
  // must NOT appear in canMarkPaid — it should be in canUnmarkPaid instead
  test('does not count is_paid=true even if status=validated (bug 2+7 regression)', () => {
    const counts = computeBatchCounts([inv({ status: 'validated', is_paid: true })]);
    expect(counts.canMarkPaid).toBe(0);
    expect(counts.canUnmarkPaid).toBe(1);
  });

  test('does not count already-paid invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'paid', is_paid: true })]);
    expect(counts.canMarkPaid).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// canUnmarkPaid
// ---------------------------------------------------------------------------

describe('canUnmarkPaid', () => {
  // Bug 2 regression: unmark-paid must match on is_paid=true, not status='paid'
  test('counts is_paid=true regardless of status (bug 2 regression)', () => {
    const counts = computeBatchCounts([inv({ status: 'validated', is_paid: true })]);
    expect(counts.canUnmarkPaid).toBe(1);
  });

  test('counts standard paid invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'paid', is_paid: true })]);
    expect(counts.canUnmarkPaid).toBe(1);
  });

  test('does not count unpaid invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'validated', is_paid: false })]);
    expect(counts.canUnmarkPaid).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// canMarkSent / canUnmarkSent (bug 6 regression)
// ---------------------------------------------------------------------------

describe('canMarkSent', () => {
  test('counts outgoing validated (bug 6 regression)', () => {
    const counts = computeBatchCounts([
      inv({ direction: 'outgoing', status: 'validated' }),
    ]);
    expect(counts.canMarkSent).toBe(1);
  });

  test('does not count incoming validated', () => {
    const counts = computeBatchCounts([
      inv({ direction: 'incoming', status: 'validated' }),
    ]);
    expect(counts.canMarkSent).toBe(0);
  });

  test('does not count outgoing sent (already sent)', () => {
    const counts = computeBatchCounts([
      inv({ direction: 'outgoing', status: 'sent' }),
    ]);
    expect(counts.canMarkSent).toBe(0);
  });

  test('does not count outgoing draft', () => {
    const counts = computeBatchCounts([
      inv({ direction: 'outgoing', status: 'draft' }),
    ]);
    expect(counts.canMarkSent).toBe(0);
  });
});

describe('canUnmarkSent', () => {
  test('counts outgoing sent', () => {
    const counts = computeBatchCounts([
      inv({ direction: 'outgoing', status: 'sent' }),
    ]);
    expect(counts.canUnmarkSent).toBe(1);
  });

  test('does not count incoming sent', () => {
    const counts = computeBatchCounts([
      inv({ direction: 'incoming', status: 'sent' }),
    ]);
    expect(counts.canUnmarkSent).toBe(0);
  });

  test('does not count outgoing validated', () => {
    const counts = computeBatchCounts([
      inv({ direction: 'outgoing', status: 'validated' }),
    ]);
    expect(counts.canUnmarkSent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// canValidate / canInvalidate
// ---------------------------------------------------------------------------

describe('canValidate', () => {
  test('counts extracted invoice', () => {
    expect(computeBatchCounts([inv({ status: 'extracted' })]).canValidate).toBe(1);
  });

  test('counts draft invoice', () => {
    expect(computeBatchCounts([inv({ status: 'draft' })]).canValidate).toBe(1);
  });

  test('does not count validated invoice', () => {
    expect(computeBatchCounts([inv({ status: 'validated' })]).canValidate).toBe(0);
  });
});

describe('canInvalidate', () => {
  test('counts validated invoice', () => {
    expect(computeBatchCounts([inv({ status: 'validated' })]).canInvalidate).toBe(1);
  });

  test('does not count extracted invoice', () => {
    expect(computeBatchCounts([inv({ status: 'extracted' })]).canInvalidate).toBe(0);
  });

  test('does not count draft invoice', () => {
    expect(computeBatchCounts([inv({ status: 'draft' })]).canInvalidate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Mixed selection matrix
// ---------------------------------------------------------------------------

describe('mixed selection', () => {
  test('correct counts for [validated, paid, draft, outgoing-sent]', () => {
    const invoices = [
      inv({ status: 'validated', is_paid: false }),
      inv({ status: 'paid', is_paid: true }),
      inv({ status: 'draft', is_paid: false }),
      inv({ direction: 'outgoing', status: 'sent', is_paid: false }),
    ];
    const counts = computeBatchCounts(invoices);

    expect(counts.canValidate).toBe(1);       // only draft
    expect(counts.canInvalidate).toBe(3);     // validated + paid + sent
    expect(counts.canMarkPaid).toBe(2);       // validated + outgoing-sent
    expect(counts.canUnmarkPaid).toBe(1);     // paid
    expect(counts.canMarkSent).toBe(0);       // no outgoing-validated
    expect(counts.canUnmarkSent).toBe(1);     // outgoing-sent
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  test('empty array returns all zeros', () => {
    const counts = computeBatchCounts([]);
    Object.values(counts).forEach((v) => expect(v).toBe(0));
  });
});
