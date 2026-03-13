/**
 * Main-thread wrapper for the simulation Web Worker.
 *
 * Provides a promise-based API so the rest of the app can
 * `await workerClient.run(params)` without dealing with
 * message passing directly.
 */

import type {
  ModelParams,
  OptionParams,
  SimulationParams,
  SimulationResult,
  PricePath,
} from '../models/types';

interface WorkerResponse {
  id: number;
  type: 'result' | 'error';
  result?: SimulationResult;
  error?: string;
}

type PendingResolve = {
  resolve: (result: SimulationResult) => void;
  reject: (err: Error) => void;
};

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingResolve>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, type, result, error } = e.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);

      if (type === 'result' && result) {
        // Reconstruct Float64Arrays from structured clone
        // (They survive structured clone natively, but just in case
        //  any serialization path converts them to plain arrays)
        for (const path of result.paths) {
          if (!(path.times instanceof Float64Array)) {
            path.times = new Float64Array(path.times);
          }
          if (!(path.prices instanceof Float64Array)) {
            path.prices = new Float64Array(path.prices);
          }
        }
        result.activePath = result.paths[result.activePathIndex];
        entry.resolve(result);
      } else {
        entry.reject(new Error(error ?? 'Worker error'));
      }
    };

    worker.onerror = (e) => {
      // Reject all pending requests
      for (const [, entry] of pending) {
        entry.reject(new Error(e.message));
      }
      pending.clear();
    };
  }
  return worker;
}

/** Run a full simulation in the worker */
export function runSimulationAsync(
  modelParams: ModelParams,
  optionParams: OptionParams,
  simulationParams: SimulationParams,
): Promise<SimulationResult> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });

    getWorker().postMessage({
      id,
      type: 'run',
      modelParams,
      optionParams,
      simulationParams,
    });
  });
}

/**
 * Reprice the active path (or switch active path) in the worker,
 * reusing existing MC paths. Used for:
 *   - Click-to-select a different path from the fan
 *   - Live reprice when strike/rate/type/style change
 */
export function repriceActivePathAsync(
  paths: PricePath[],
  activePathIndex: number,
  optionParams: OptionParams,
  modelParams: ModelParams,
  simulationParams: SimulationParams,
): Promise<SimulationResult> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });

    getWorker().postMessage({
      id,
      type: 'reprice',
      paths,
      activePathIndex,
      optionParams,
      modelParams,
      simulationParams,
    });
  });
}

/** Terminate the worker (for cleanup) */
export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    for (const [, entry] of pending) {
      entry.reject(new Error('Worker terminated'));
    }
    pending.clear();
  }
}
