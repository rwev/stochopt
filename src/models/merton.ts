import type { MertonParams, PricePath } from './types';
import type { RNG } from './rng';

/**
 * Generate a single Merton Jump-Diffusion price path.
 *
 * Model:
 *   dS/S = (mu - lambda*k)dt + sigma*dW + J*dN
 *
 * where:
 *   N ~ Poisson(lambda*dt) — number of jumps per interval
 *   J ~ LogNormal(muJ, sigmaJ^2) — jump multiplier
 *   k = E[e^J - 1] = exp(muJ + sigmaJ^2/2) - 1  (compensator)
 *
 * Jump events are recorded so the UI can annotate them on the path.
 */
export function generateMertonPath(
  params: MertonParams,
  T: number,
  numSteps: number,
  rng: RNG,
): PricePath {
  const dt = T / numSteps;
  const times = new Float64Array(numSteps + 1);
  const prices = new Float64Array(numSteps + 1);
  const jumpIndices: number[] = [];

  times[0] = 0;
  prices[0] = params.s0;

  // Compensator: ensures the drift-adjusted process is a martingale
  const k = Math.exp(params.muJ + 0.5 * params.sigmaJ * params.sigmaJ) - 1;

  const drift =
    (params.mu - params.lambda * k - 0.5 * params.sigma * params.sigma) * dt;
  const diffusion = params.sigma * Math.sqrt(dt);

  for (let i = 1; i <= numSteps; i++) {
    times[i] = i * dt;

    // Diffusion component (same as GBM)
    const Z = rng.normal();

    // Jump component: Poisson number of jumps, each log-normal
    const numJumps = rng.poisson(params.lambda * dt);
    let jumpComponent = 0;
    if (numJumps > 0) {
      jumpIndices.push(i);
      for (let j = 0; j < numJumps; j++) {
        jumpComponent += params.muJ + params.sigmaJ * rng.normal();
      }
    }

    prices[i] =
      prices[i - 1] * Math.exp(drift + diffusion * Z + jumpComponent);
  }

  return { times, prices, jumpIndices };
}
