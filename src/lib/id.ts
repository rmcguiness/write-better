/** Compact, collision-resistant id for local records (no crypto dep needed). */
export function newId(prefix = 'p'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
