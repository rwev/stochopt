/**
 * Web Worker entry point for simulation computation.
 *
 * Receives simulation parameters via postMessage, runs the engine,
 * and posts back the result. This keeps the main thread responsive
 * during heavy American option pricing (binomial tree at every timestep).
 *
 * Supports two message types:
 *   - 'run'     : full simulation (generate paths + compute option states)
 *   - 'reprice' : recompute option states for a (possibly different) active
 *                 path with (possibly different) option/model params, reusing
 *                 existing MC paths. Used for:
 *                   1. Click-to-select a different path from the fan
 *                   2. Live reprice when strike/rate/type/style change
 */

import type {
  ModelParams,
  OptionParams,
  SimulationParams,
  PricePath,
} from '../models/types';
import { runSimulation, computeOptionStatesForPath } from './engine';

export interface WorkerRequest {
  id: number;
  type: 'run' | 'reprice';
  // For 'run':
  modelParams?: ModelParams;
  optionParams?: OptionParams;
  simulationParams?: SimulationParams;
  // For 'reprice':
  paths?: PricePath[];
  activePathIndex?: number;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;

  try {
    if (req.type === 'run') {
      const result = runSimulation(
        req.modelParams!,
        req.optionParams!,
        req.simulationParams!,
      );

      self.postMessage({
        id: req.id,
        type: 'result',
        result,
      });
    } else if (req.type === 'reprice') {
      // Reuse existing MC paths; recompute option states for the active path
      // with the given option/model params.
      const paths = req.paths!;
      const activePathIndex = req.activePathIndex!;
      const optionParams = req.optionParams!;
      const modelParams = req.modelParams!;
      const simulationParams = req.simulationParams!;
      const activePath = paths[activePathIndex];

      const optionStates = computeOptionStatesForPath(
        activePath,
        optionParams,
        modelParams,
      );

      self.postMessage({
        id: req.id,
        type: 'result',
        result: {
          paths,
          activePathIndex,
          activePath,
          optionStates,
          modelParams,
          optionParams,
          simulationParams,
        },
      });
    }
  } catch (err) {
    self.postMessage({
      id: req.id,
      type: 'error',
      error: String(err),
    });
  }
};
