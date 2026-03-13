import type { OptionType, Greeks } from '../models/types';
import { normalCDF, normalPDF } from '../utils/math';

// ---------------------------------------------------------------------------
// Black-Scholes analytical pricing and Greeks
// ---------------------------------------------------------------------------

function d1d2(S: number, K: number, r: number, sigma: number, T: number) {
  const sqrtT = Math.sqrt(T);
  const d1 =
    (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return { d1, d2, sqrtT };
}

/** Black-Scholes option price */
export function bsPrice(
  S: number,
  K: number,
  r: number,
  sigma: number,
  T: number,
  type: OptionType,
): number {
  if (T <= 1e-10) {
    return type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
  }

  const { d1, d2 } = d1d2(S, K, r, sigma, T);

  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

/** Black-Scholes analytical Greeks */
export function bsGreeks(
  S: number,
  K: number,
  r: number,
  sigma: number,
  T: number,
  type: OptionType,
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

  const { d1, d2, sqrtT } = d1d2(S, K, r, sigma, T);
  const nd1 = normalPDF(d1);
  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const expRt = Math.exp(-r * T);

  // Gamma and Vega are the same for calls and puts
  const gamma = nd1 / (S * sigma * sqrtT);
  const vega = S * nd1 * sqrtT; // raw: per 1 unit sigma

  let delta: number;
  let theta: number;
  let rho: number;

  if (type === 'call') {
    delta = Nd1;
    theta = -(S * nd1 * sigma) / (2 * sqrtT) - r * K * expRt * Nd2;
    rho = K * T * expRt * Nd2;
  } else {
    delta = Nd1 - 1;
    theta =
      -(S * nd1 * sigma) / (2 * sqrtT) + r * K * expRt * normalCDF(-d2);
    rho = -K * T * expRt * normalCDF(-d2);
  }

  return {
    delta,
    gamma,
    theta: theta / 365, // per calendar day
    vega: vega / 100, // per 1% vol move
    rho: rho / 100, // per 1% rate move
  };
}
