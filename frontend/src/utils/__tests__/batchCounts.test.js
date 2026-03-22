import { describe, test, expect } from 'vitest';
import { computeBatchCounts } from '../batchCounts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inv(overrides) {
  return {
    status: 'extracted',
    is_archived: false,
    is_exported: false,
    direction: 'incoming',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// canMarkPaid — only validated or sent qualify
// ---------------------------------------------------------------------------

describe('canMarkPaid', () => {
  test('counts validated invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'validated' })]);
    expect(counts.canMarkPaid).toBe(1);
  });

  test('counts sent invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'sent' })]);
    expect(counts.canMarkPaid).toBe(1);
  });

  test('does not count draft invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'draft' })]);
    expect(counts.canMarkPaid).toBe(0);
  });

  test('does not count extracted invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'extracted' })]);
    expect(counts.canMarkPaid).toBe(0);
  });

  test('does not count already-paid invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'paid' })]);
    expect(counts.canMarkPaid).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// canUnmarkPaid — only status='paid' qualifies
// ---------------------------------------------------------------------------

describe('canUnmarkPaid', () => {
  test('counts paid invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'paid' })]);
    expect(counts.canUnmarkPaid).toBe(1);
  });

  test('does not count validated invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'validated' })]);
    expect(counts.canUnmarkPaid).toBe(0);
  });

  test('does not count extracted invoice', () => {
    const counts = computeBatchCounts([inv({ status: 'extracted' })]);
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
      inv({ status: 'validated' }),
      inv({ status: 'paid' }),
      inv({ status: 'draft' }),
      inv({ direction: 'outgoing', status: 'sent' }),
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
