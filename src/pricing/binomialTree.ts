import type { OptionType, Greeks } from '../models/types';

// ---------------------------------------------------------------------------
// Cox-Ross-Rubinstein (CRR) Binomial Tree for American option pricing
// ---------------------------------------------------------------------------

const DEFAULT_STEPS = 200;

/**
 * Price an American option using the CRR binomial tree.
 *
 * At each node we compare the continuation value (discounted expected value
 * from the two child nodes) against the immediate exercise value, taking
 * the maximum.  This naturally handles early exercise.
 */
export function crrPrice(
  S: number,
  K: number,
  r: number,
  sigma: number,
  T: number,
  type: OptionType,
  steps: number = DEFAULT_STEPS,
): number {
  if (T <= 1e-10) {
    return type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
  }

  const dt = T / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const disc = Math.exp(-r * dt);
  const p = (Math.exp(r * dt) - d) / (u - d);
  const q = 1 - p;

  // Terminal payoffs
  const values = new Float64Array(steps + 1);
  for (let i = 0; i <= steps; i++) {
    const spotAtNode = S * Math.pow(u, steps - i) * Math.pow(d, i);
    values[i] =
      type === 'call'
        ? Math.max(spotAtNode - K, 0)
        : Math.max(K - spotAtNode, 0);
  }

  // Backward induction with early exercise check
  for (let j = steps - 1; j >= 0; j--) {
    for (let i = 0; i <= j; i++) {
      const holdValue = disc * (p * values[i] + q * values[i + 1]);
      const spotAtNode = S * Math.pow(u, j - i) * Math.pow(d, i);
      const exerciseValue =
        type === 'call'
          ? Math.max(spotAtNode - K, 0)
          : Math.max(K - spotAtNode, 0);
      values[i] = Math.max(holdValue, exerciseValue);
    }
  }

  return values[0];
}

/**
 * American Greeks via central finite differences (bump-and-revalue).
 *
 * Each Greek requires re-running the binomial tree with a bumped parameter:
 *   delta = (V(S+h) - V(S-h)) / (2h)
 *   gamma = (V(S+h) - 2V(S) + V(S-h)) / h^2
 *   theta = (V(T-dt) - V(T)) / dt    (per day)
 *   vega  = (V(sigma+h) - V(sigma-h)) / (2h)
 *   rho   = (V(r+h) - V(r-h)) / (2h)
 */
export function crrGreeks(
  S: number,
  K: number,
  r: number,
  sigma: number,
  T: number,
  type: OptionType,
  steps: number = DEFAULT_STEPS,
): Greeks {
  if (T <= 1e-10) {
    const itm = type === 'call' ? S > K : S < K;
    return {
      delta: itm ? (type === 'call' ? 1 : -1) : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }

  const V0 = crrPrice(S, K, r, sigma, T, type, steps);

  // Delta & Gamma — bump spot
  const dS = S * 0.005; // 0.5% bump
  const Vup = crrPrice(S + dS, K, r, sigma, T, type, steps);
  const Vdn = crrPrice(S - dS, K, r, sigma, T, type, steps);
  const delta = (Vup - Vdn) / (2 * dS);
  const gamma = (Vup - 2 * V0 + Vdn) / (dS * dS);

  // Theta — bump time forward by 1 day
  const dT = 1 / 365;
  const remainingAfterBump = T - dT;
  const theta =
    remainingAfterBump > 0
      ? crrPrice(S, K, r, sigma, remainingAfterBump, type, steps) - V0
      : (type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0)) - V0;

  // Vega — bump volatility
  const dSigma = 0.005; // 0.5% absolute bump
  const VvUp = crrPrice(S, K, r, sigma + dSigma, T, type, steps);
  const VvDn = crrPrice(S, K, r, sigma - dSigma, T, type, steps);
  const vega = (VvUp - VvDn) / (2 * dSigma) / 100; // per 1% move

  // Rho — bump rate
  const dR = 0.0005; // 5 bps bump
  const VrUp = crrPrice(S, K, r + dR, sigma, T, type, steps);
  const VrDn = crrPrice(S, K, r - dR, sigma, T, type, steps);
  const rho = (VrUp - VrDn) / (2 * dR) / 100; // per 1% move

  return { delta, gamma, theta, vega, rho };
}
