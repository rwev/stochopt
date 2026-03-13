# StochOpt

Option pricing visualization on simulated stochastic price paths.

**[Live Demo](https://rwev.github.io/stochopt/)**

## What It Does

Generates Monte Carlo price paths using stochastic models (GBM, Merton Jump-Diffusion), then prices options and computes Greeks at every timestep along the path. Scrubbing through time is instantaneous — all values are pre-computed.

### Panels

- **Price Path** — MC fan of 150 paths with click-to-select active path, strike line, jump markers (Merton), timeline scrubber
- **Distribution** — Conditional terminal distribution S(T)|S(t) as log-normal density overlaid with MC histogram
- **Option Price** — Value decomposition into intrinsic value and time value areas
- **Greeks** — Tabbed display of Delta, Gamma, Theta, Vega, Rho along the active path
- **Payoff** — P&L at expiry with profit/loss shading

### Features

- **Two stochastic models**: GBM (exact log-normal) and Merton Jump-Diffusion (Poisson jumps)
- **Two pricing methods**: Black-Scholes analytical (European) and CRR binomial tree (American, 200 steps)
- **Implied Volatility control**: IV can be locked to model sigma or set independently for scenario analysis
- **Live repricing**: Changing option parameters (strike, rate, type, style, IV) instantly reprices along existing paths without re-simulation
- **Click-to-select**: Click any path in the MC fan to make it the active path — all panels update
- **Playback**: Animate through time with adjustable speed
- **All computation off main thread**: Web Worker keeps the UI responsive during heavy American option pricing

## Tech Stack

React 19, D3.js 7, TypeScript 5.9, Vite 8. No other runtime dependencies.

## Development

```bash
npm install
npm run dev       # Dev server with HMR
npm run build     # Type-check + production bundle
npm run lint      # ESLint
```

## Project Structure

```
src/
  models/        — Type definitions, GBM/Merton path generation, seeded PRNG
  pricing/       — Black-Scholes, CRR binomial tree, pricing dispatch
  simulation/    — Orchestration engine, Web Worker, promise-based worker client
  context/       — React Context + useReducer state management
  hooks/         — useDimensions (ResizeObserver), usePlayback (rAF animation)
  utils/         — Math functions (normalCDF, etc.), formatters
  components/
    controls/    — NumberInput, SelectInput, SimulationControls, OptionControls,
                   MetricsBar, TimelineScrubber
    layout/      — PanelContainer (reusable panel wrapper)
    panels/      — PricePathPanel, OptionPricePanel, GreeksPanel,
                   DistributionPanel, PayoffPanel
```
