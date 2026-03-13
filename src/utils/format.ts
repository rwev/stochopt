/** Format a number as a price (2 decimal places) */
export function formatPrice(n: number): string {
  return n.toFixed(2);
}

/** Format a number as a percentage (e.g. 0.05 → "5.00%") */
export function formatPct(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

/** Format a Greek value with appropriate precision */
export function formatGreek(n: number): string {
  if (Math.abs(n) < 0.0001) return n.toExponential(2);
  return n.toFixed(4);
}

/** Format time as fraction of year (e.g. 0.5 → "0.50y" or "183d") */
export function formatTime(t: number, asdays = false): string {
  if (asdays) {
    return Math.round(t * 365) + 'd';
  }
  return t.toFixed(2) + 'y';
}
