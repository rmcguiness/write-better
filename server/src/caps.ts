/**
 * Parse a usage cap from an environment value: a whole number >= 0.
 * Every plan is capped so one account can't run up an unbounded AI bill, so
 * -1 / "unlimited" style values are rejected with a warning and the default is used.
 */
export function parseCap(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0) return n;
  console.warn(`[write-better] ${name}=${raw} is not a whole number >= 0; using ${fallback}.`);
  return fallback;
}
