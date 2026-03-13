import type {
  ModelParams,
  OptionParams,
  SimulationParams,
  PricePath,
  OptionState,
  SimulationResult,
} from '../models/types';
import { createRNG } from '../models/rng';
import { generateGBMPath } from '../models/gbm';
import { generateMertonPath } from '../models/merton';
import { computeOptionState } from '../pricing/pricingEngine';

/**
 * Pre-compute option state (price + Greeks) at every timestep of a path.
 * Shared helper used by runSimulation, recomputeActivePathStates, and
 * the worker's reprice handler.
 */
export function computeOptionStatesForPath(
  path: PricePath,
  optionParams: OptionParams,
  modelParams: ModelParams,
): OptionState[] {
  const numSteps = path.times.length - 1;
  const states: OptionState[] = new Array(numSteps + 1);
  for (let i = 0; i <= numSteps; i++) {
    states[i] = computeOptionState(
      path.prices[i],
      path.times[i],
      optionParams,
      modelParams,
    );
  }
  return states;
}

/**
 * Run a complete simulation:
 *   1. Generate N Monte Carlo price paths
 *   2. Select an active path
 *   3. Pre-compute option state (price + Greeks) at every timestep of the active path
 *
 * The result contains everything needed to render all panels.
 * Scrubbing through time is then a pure index lookup — zero recomputation.
 */
export function runSimulation(
  modelParams: ModelParams,
  optionParams: OptionParams,
  simulationParams: SimulationParams,
): SimulationResult {
  const rng = createRNG(simulationParams.seed);
  const T = optionParams.expiry;
  const numSteps = simulationParams.numSteps;

  // 1. Generate all MC paths
  const paths: PricePath[] = [];
  for (let i = 0; i < simulationParams.numPaths; i++) {
    const path =
      modelParams.type === 'gbm'
        ? generateGBMPath(modelParams, T, numSteps, rng)
        : generateMertonPath(modelParams, T, numSteps, rng);
    paths.push(path);
  }

  // 2. Active path — first path by default; user can click to switch
  const activePathIndex = 0;
  const activePath = paths[activePathIndex];

  // 3. Pre-compute option states along the active path
  const optionStates = computeOptionStatesForPath(activePath, optionParams, modelParams);

  return {
    paths,
    activePathIndex,
    activePath,
    optionStates,
    modelParams,
    optionParams,
    simulationParams,
  };
}

/**
 * Recompute option states for a different active path without
 * regenerating all MC paths.  Used when the user clicks a
 * different path in the fan.
 */
export function recomputeActivePathStates(
  result: SimulationResult,
  newActiveIndex: number,
): SimulationResult {
  const activePath = result.paths[newActiveIndex];
  const optionStates = computeOptionStatesForPath(
    activePath,
    result.optionParams,
    result.modelParams,
  );

  return {
    ...result,
    activePathIndex: newActiveIndex,
    activePath,
    optionStates,
  };
}
