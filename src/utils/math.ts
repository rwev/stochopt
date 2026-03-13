/**
 * Standard normal CDF using Abramowitz & Stegun approximation (7.1.26).
 * Max error ~1.5e-7.
 */
export function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const y = 1.0 - poly * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

/** Standard normal PDF */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Log-normal PDF: density of X where ln(X) ~ N(mu, sigma^2)
 * Evaluated at x > 0.
 */
export function logNormalPDF(x: number, mu: number, sigma: number): number {
  if (x <= 0) return 0;
  const logx = Math.log(x);
  const z = (logx - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (x * sigma * Math.sqrt(2 * Math.PI));
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
