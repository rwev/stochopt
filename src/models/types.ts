// --- Option types ---

export type OptionType = 'call' | 'put';
export type OptionStyle = 'european' | 'american';
export type ModelType = 'gbm' | 'merton';

// --- Model parameters ---

export interface GBMParams {
  type: 'gbm';
  s0: number;     // initial price
  mu: number;     // drift (annualized)
  sigma: number;  // volatility (annualized)
}

export interface MertonParams {
  type: 'merton';
  s0: number;       // initial price
  mu: number;       // drift
  sigma: number;    // diffusion volatility
  lambda: number;   // jump intensity (expected jumps per year)
  muJ: number;      // mean of log jump size
  sigmaJ: number;   // std of log jump size
}

export type ModelParams = GBMParams | MertonParams;

// --- Option parameters ---

export interface OptionParams {
  strike: number;
  expiry: number;         // time to expiry in years
  riskFreeRate: number;
  optionType: OptionType;
  optionStyle: OptionStyle;
  iv: number;             // implied volatility used for pricing (may differ from model sigma)
}

// --- Simulation parameters ---

export interface SimulationParams {
  numPaths: number;   // number of MC paths (fan)
  numSteps: number;   // time steps per path
  seed: number;       // RNG seed for reproducibility
}

// --- Output structures ---

/** A single simulated price path */
export interface PricePath {
  times: Float64Array;      // time values [0, T]
  prices: Float64Array;     // price at each timestep
  jumpIndices?: number[];   // timestep indices where jumps occurred (Merton only)
}

/** Greeks at a single point */
export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;  // per day
  vega: number;   // per 1% vol move
  rho: number;    // per 1% rate move
}

/** Option state at a single timestep along the active path */
export interface OptionState {
  price: number;
  intrinsicValue: number;
  timeValue: number;
  greeks: Greeks;
}

/** Complete simulation result — everything needed to render all panels */
export interface SimulationResult {
  paths: PricePath[];
  activePathIndex: number;
  activePath: PricePath;
  optionStates: OptionState[];
  modelParams: ModelParams;
  optionParams: OptionParams;
  simulationParams: SimulationParams;
}

// --- Option chain (live market data) ---

/** A single option contract in the chain */
export interface OptionChainEntry {
  strike: number;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume: number;
  openInterest: number;
  iv: number;       // decimal (0.28 = 28%)
  delta: number;
}

/** A strike row pairing the call and put at that strike */
export interface OptionChainStrike {
  strike: number;
  call: OptionChainEntry | null;
  put: OptionChainEntry | null;
}

/** Full option chain for a single expiration */
export interface OptionChain {
  ticker: string;
  spotPrice: number;
  expiration: string;         // ISO date "YYYY-MM-DD"
  daysToExpiration: number;
  expirations: string[];      // all available expiration dates
  strikes: OptionChainStrike[];
}
