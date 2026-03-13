import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  ModelParams,
  OptionParams,
  SimulationParams,
  SimulationResult,
} from '../models/types';
import {
  runSimulationAsync,
  repriceActivePathAsync,
} from '../simulation/workerClient';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface SimulationState {
  modelParams: ModelParams;
  optionParams: OptionParams;
  simulationParams: SimulationParams;
  result: SimulationResult | null;
  currentStep: number; // index into activePath, drives scrubber
  isPlaying: boolean;
  playbackSpeed: number; // steps per second
  isComputing: boolean;
  ivLocked: boolean; // when true, optionParams.iv tracks modelParams.sigma
}

const DEFAULT_STATE: SimulationState = {
  modelParams: {
    type: 'gbm',
    s0: 100,
    mu: 0.05,
    sigma: 0.2,
  },
  optionParams: {
    strike: 100,
    expiry: 1.0,
    riskFreeRate: 0.05,
    optionType: 'call',
    optionStyle: 'european',
    iv: 0.2,
  },
  simulationParams: {
    numPaths: 150,
    numSteps: 250,
    seed: 42,
  },
  result: null,
  currentStep: 0,
  isPlaying: false,
  playbackSpeed: 30,
  isComputing: false,
  ivLocked: true,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'SET_MODEL_PARAMS'; payload: ModelParams }
  | { type: 'SET_OPTION_PARAMS'; payload: OptionParams }
  | { type: 'SET_SIMULATION_PARAMS'; payload: SimulationParams }
  | { type: 'SET_RESULT'; payload: SimulationResult }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'SET_COMPUTING'; payload: boolean }
  | { type: 'SET_IV_LOCKED'; payload: boolean };

function reducer(state: SimulationState, action: Action): SimulationState {
  switch (action.type) {
    case 'SET_MODEL_PARAMS': {
      const next: SimulationState = { ...state, modelParams: action.payload };
      // When IV is locked to model sigma, sync it on every sigma change
      if (state.ivLocked && action.payload.sigma !== state.optionParams.iv) {
        next.optionParams = { ...state.optionParams, iv: action.payload.sigma };
      }
      return next;
    }
    case 'SET_OPTION_PARAMS':
      return { ...state, optionParams: action.payload };
    case 'SET_SIMULATION_PARAMS':
      return { ...state, simulationParams: action.payload };
    case 'SET_RESULT':
      return { ...state, result: action.payload, isComputing: false };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_SPEED':
      return { ...state, playbackSpeed: action.payload };
    case 'SET_COMPUTING':
      return { ...state, isComputing: action.payload };
    case 'SET_IV_LOCKED': {
      if (action.payload) {
        // Locking — snap IV to current model sigma
        return {
          ...state,
          ivLocked: true,
          optionParams: { ...state.optionParams, iv: state.modelParams.sigma },
        };
      }
      return { ...state, ivLocked: false };
    }
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface SimulationContextValue {
  state: SimulationState;
  dispatch: React.Dispatch<Action>;
  run: () => void;
  selectPath: (pathIndex: number) => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  // Ref to track the latest state for async callbacks without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // --- Run: full simulation (generate new paths + compute option states) ---
  const run = useCallback(() => {
    dispatch({ type: 'SET_COMPUTING', payload: true });
    dispatch({ type: 'SET_PLAYING', payload: false });

    runSimulationAsync(
      stateRef.current.modelParams,
      stateRef.current.optionParams,
      stateRef.current.simulationParams,
    ).then(
      (result) => {
        dispatch({ type: 'SET_RESULT', payload: result });
        dispatch({ type: 'SET_STEP', payload: 0 });
      },
      (err) => {
        console.error('Simulation failed:', err);
        dispatch({ type: 'SET_COMPUTING', payload: false });
      },
    );
  }, []);

  // --- Select path: switch active path in the worker (async) ---
  const selectPath = useCallback((pathIndex: number) => {
    const s = stateRef.current;
    if (!s.result || pathIndex === s.result.activePathIndex) return;

    dispatch({ type: 'SET_COMPUTING', payload: true });
    dispatch({ type: 'SET_PLAYING', payload: false });

    repriceActivePathAsync(
      s.result.paths,
      pathIndex,
      s.result.optionParams,
      s.result.modelParams,
      s.result.simulationParams,
    ).then(
      (result) => {
        dispatch({ type: 'SET_RESULT', payload: result });
        dispatch({ type: 'SET_STEP', payload: 0 });
      },
      (err) => {
        console.error('Path selection failed:', err);
        dispatch({ type: 'SET_COMPUTING', payload: false });
      },
    );
  }, []);

  // --- Auto-reprice when optionParams change (if simulation already ran) ---
  // Skip the first render (no result yet) and the initial mount.
  const prevOptionParamsRef = useRef<OptionParams | null>(null);

  useEffect(() => {
    const prev = prevOptionParamsRef.current;
    prevOptionParamsRef.current = state.optionParams;

    // Skip first render / no simulation yet
    if (!prev || !state.result) return;

    // No change
    if (prev === state.optionParams) return;

    // If expiry changed, paths are invalidated — need full re-simulation
    if (prev.expiry !== state.optionParams.expiry) {
      dispatch({ type: 'SET_COMPUTING', payload: true });
      dispatch({ type: 'SET_PLAYING', payload: false });

      runSimulationAsync(
        state.modelParams,
        state.optionParams,
        state.simulationParams,
      ).then(
        (result) => {
          dispatch({ type: 'SET_RESULT', payload: result });
          dispatch({ type: 'SET_STEP', payload: 0 });
        },
        (err) => {
          console.error('Re-simulation failed:', err);
          dispatch({ type: 'SET_COMPUTING', payload: false });
        },
      );
      return;
    }

    // Strike, rate, type, or style changed — fast reprice, reuse paths
    dispatch({ type: 'SET_COMPUTING', payload: true });

    repriceActivePathAsync(
      state.result.paths,
      state.result.activePathIndex,
      state.optionParams,
      state.modelParams,
      state.result.simulationParams,
    ).then(
      (result) => {
        dispatch({ type: 'SET_RESULT', payload: result });
      },
      (err) => {
        console.error('Reprice failed:', err);
        dispatch({ type: 'SET_COMPUTING', payload: false });
      },
    );
  }, [state.optionParams]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SimulationContext.Provider value={{ state, dispatch, run, selectPath }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulationContext(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx)
    throw new Error(
      'useSimulationContext must be used within SimulationProvider',
    );
  return ctx;
}
