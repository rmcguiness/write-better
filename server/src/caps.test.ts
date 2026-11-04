import { expect, it, vi } from 'vitest';
import { parseCap } from './caps.js';
it('accepts whole numbers >= 0 and falls back on blank input', () => {
 expect(parseCap('X', '300', 10)).toBe(300);
 expect(parseCap('X', '0', 10)).toBe(0);
 expect(parseCap('X', undefined, 10)).toBe(10);
 expect(parseCap('X', ' ', 10)).toBe(10);
});
it.each(['-1', '1.5', 'unlimited', 'Infinity'])('rejects %s (no unlimited plans)', raw => {
 const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
 expect(parseCap('PRO_MONTHLY_LIMIT', raw, 300)).toBe(300);
 expect(warn).toHaveBeenCalledOnce();
});
