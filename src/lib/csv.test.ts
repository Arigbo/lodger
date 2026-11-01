import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(toCsv([['a', 'b,c', 'say "hi"', 'x\ny']])).toBe('a,"b,c","say ""hi""","x\ny"');
  });
  it('renders empty cells and joins rows with CRLF', () => {
    expect(toCsv([[1, null, undefined], ['z']])).toBe('1,,\r\nz');
  });
  it('neutralises formula injection', () => {
    expect(toCsv([['=SUM(A1)', '-5', '@cmd']])).toBe("'=SUM(A1),'-5,'@cmd");
  });
});
