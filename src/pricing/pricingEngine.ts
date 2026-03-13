import type { ModelParams, OptionParams, OptionState } from '../models/types';
import { bsPrice, bsGreeks } from './blackScholes';
import { crrPrice, crrGreeks } from './binomialTree';

/**
 * Compute the full option state (price, intrinsic/time value, Greeks)
 * at a single point (S, t) along a simulated path.
 *
 * Dispatches to Black-Scholes for European options and
 * CRR binomial tree for American options.
 */
export function computeOptionState(
  S: number,
  t: number,
  optionParams: OptionParams,
  _modelParams: ModelParams,
): OptionState {
  const remainingTime = Math.max(optionParams.expiry - t, 0);
  const sigma = optionParams.iv;
  const r = optionParams.riskFreeRate;
  const K = optionParams.strike;
  const type = optionParams.optionType;

  let price: number;
  let greeks;

  if (optionParams.optionStyle === 'european') {
    price = bsPrice(S, K, r, sigma, remainingTime, type);
    greeks = bsGreeks(S, K, r, sigma, remainingTime, type);
  } else {
    // American — use binomial tree with 200 steps (balance of speed & accuracy)
    price = crrPrice(S, K, r, sigma, remainingTime, type, 200);
    greeks = crrGreeks(S, K, r, sigma, remainingTime, type, 200);
  }

  const intrinsicValue =
    type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const timeValue = Math.max(price - intrinsicValue, 0);

  return { price, intrinsicValue, timeValue, greeks };
}
