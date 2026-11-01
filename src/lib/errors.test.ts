import { describe, expect, it } from 'vitest';
import { getErrorCode, getErrorMessage } from './errors';

describe('error helpers', () => {
  it('reads messages from errors, strings and objects', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('plain')).toBe('plain');
    expect(getErrorMessage({ message: 'obj' })).toBe('obj');
    expect(getErrorMessage(42, 'fallback')).toBe('fallback');
  });
  it('reads codes', () => {
    expect(getErrorCode({ code: 'auth/user-not-found' })).toBe('auth/user-not-found');
    expect(getErrorCode(new Error('x'))).toBeUndefined();
  });
});

import { describeUploadError } from './errors';

describe('describeUploadError', () => {
  it('explains quota errors', () => {
    expect(describeUploadError({ code: 'storage/quota-exceeded' }).title).toBe('Photo storage is unavailable');
  });
  it('falls back to the error message', () => {
    expect(describeUploadError(new Error('boom')).description).toBe('boom');
  });
});
