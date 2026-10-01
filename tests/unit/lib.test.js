import { describe, it, expect } from 'vitest';
import { normalizeAnswer, sha256hex, timingEqualHex, rateLimited, _resetBuckets } from '../../api/_lib.js';

describe('api lib', () => {
  it('sha256(argon2) confere com gabarito da Flag 1', () => {
    expect(sha256hex(normalizeAnswer('5k{argon2}'))).toBe(
      '0ce753eaacf78542192b0639c61868a79e4221f7914c7b6c69fc0f639612d419'
    );
  });
  it('timingEqual não vaza por exceção', () => {
    expect(timingEqualHex('ab', 'ab')).toBe(true);
    expect(timingEqualHex('ab', 'ac')).toBe(false);
    expect(timingEqualHex('zz', 'ab')).toBe(false);
  });
  it('rate-limit barra após o limite', () => {
    _resetBuckets();
    for (let i = 0; i < 10; i++) expect(rateLimited('1.2.3.4', 10, 60_000).limited).toBe(false);
    expect(rateLimited('1.2.3.4', 10, 60_000).limited).toBe(true);
  });
});
