import type { GBMParams, PricePath } from './types';
import type { RNG } from './rng';

/**
 * Generate a single Geometric Brownian Motion price path.
 *
 * Uses the exact log-normal solution:
 *   S(t+dt) = S(t) * exp((mu - sigma^2/2)*dt + sigma*sqrt(dt)*Z)
 *
 * This avoids Euler-Maruyama discretization bias entirely.
 */
export function generateGBMPath(
  params: GBMParams,
  T: number,
  numSteps: number,
  rng: RNG,
): PricePath {
  const dt = T / numSteps;
  const times = new Float64Array(numSteps + 1);
  const prices = new Float64Array(numSteps + 1);

  times[0] = 0;
  prices[0] = params.s0;

  const drift = (params.mu - 0.5 * params.sigma * params.sigma) * dt;
  const diffusion = params.sigma * Math.sqrt(dt);

  for (let i = 1; i <= numSteps; i++) {
    times[i] = i * dt;
    prices[i] = prices[i - 1] * Math.exp(drift + diffusion * rng.normal());
  }

  return { times, prices };
}
