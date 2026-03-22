import { describe, test, expect } from 'vitest';
import { validateFiles } from '../fileValidation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name, sizeBytes, type = 'application/pdf') {
  return new File(['x'.repeat(Math.min(sizeBytes, 1))], name, { type });
}

// We override File.prototype.size because File() ignores the size arg
function makeFileWithSize(name, sizeBytes) {
  const file = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

const TEN_MB = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateFiles', () => {
  test('valid PDF under 10MB passes', () => {
    const file = makeFileWithSize('invoice.pdf', TEN_MB - 1);
    const { validFiles, errors } = validateFiles([file]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  test('valid jpg image passes', () => {
    const file = makeFileWithSize('photo.jpg', 1024);
    Object.defineProperty(file, 'name', { value: 'photo.jpg' });
    const { validFiles, errors } = validateFiles([file]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  test('valid png image passes', () => {
    const file = makeFileWithSize('scan.png', 1024);
    const { validFiles, errors } = validateFiles([file]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  test('file over 10MB produces error containing "too large"', () => {
    const file = makeFileWithSize('big.pdf', TEN_MB + 1);
    const { validFiles, errors } = validateFiles([file]);
    expect(validFiles).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].toLowerCase()).toMatch(/too large/);
  });

  test('unsupported type produces error', () => {
    const file = new File(['x'], 'report.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const { validFiles, errors } = validateFiles([file]);
    expect(validFiles).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  test('mixed valid and invalid splits correctly', () => {
    const valid = makeFileWithSize('ok.pdf', 1024);
    const tooBig = makeFileWithSize('big.pdf', TEN_MB + 1);
    const wrongType = new File(['x'], 'data.xlsx', { type: 'text/plain' });

    const { validFiles, errors } = validateFiles([valid, tooBig, wrongType]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });

  test('empty array returns both empty', () => {
    const { validFiles, errors } = validateFiles([]);
    expect(validFiles).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  test('.jpeg extension is supported', () => {
    const file = makeFileWithSize('scan.jpeg', 500);
    const { validFiles, errors } = validateFiles([file]);
    expect(validFiles).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });
});
