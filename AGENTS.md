# AGENTS.md — StochOpt

Guide for AI coding agents operating in this repository.

## Project Overview

React + D3.js + TypeScript single-page application that visualizes option pricing
and Greeks driven by simulated stochastic price paths (GBM, Merton Jump-Diffusion).
All computation is client-side, offloaded to a Web Worker.

## Build & Run Commands

```bash
npm run dev          # Vite dev server with HMR
npm run build        # tsc -b && vite build (type-check then bundle)
npm run lint         # ESLint (flat config, TS + React)
npm run preview      # Preview production build locally
npx tsc --noEmit     # Type-check only (fast, no output)
```

No test framework is configured. There are no test files.

## Tech Stack & Dependencies

- **Runtime**: React 19, D3.js 7 — no other runtime dependencies
- **Build**: Vite 8, TypeScript 5.9 (strict mode)
- **No UI library, no CSS-in-JS, no Tailwind, no state library, no router**
- Package manager: npm (`package-lock.json`)
- Module type: ESM (`"type": "module"`)

## TypeScript Configuration

Strict mode is enabled with additional strictness:

- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax: true` — **all type-only imports must use `import type`**
- `erasableSyntaxOnly: true` — **no enums**; use string literal union types instead
- Target: ES2023, JSX: react-jsx

## Project Structure

```
src/
  main.tsx, App.tsx, App.css, index.css, theme.ts
  models/        — types.ts, gbm.ts, merton.ts, rng.ts
  pricing/       — pricingEngine.ts, blackScholes.ts, binomialTree.ts
  simulation/    — engine.ts, worker.ts, workerClient.ts
  context/       — SimulationContext.tsx
  hooks/         — useDimensions.ts, usePlayback.ts
  utils/         — math.ts, format.ts
  components/
    controls/    — NumberInput.tsx, SelectInput.tsx, SimulationControls.tsx,
                   OptionControls.tsx, MetricsBar.tsx, TimelineScrubber.tsx
    layout/      — PanelContainer.tsx
    panels/      — PricePathPanel.tsx, OptionPricePanel.tsx, GreeksPanel.tsx,
                   DistributionPanel.tsx, PayoffPanel.tsx
```

## Code Style

### Imports

1. React imports first (runtime + `type` in same statement is OK)
2. Third-party (`d3`)
3. Internal imports (context, hooks, components, models, utils)
4. CSS imports last

Type-only imports **must** use `import type { ... }` (compiler-enforced):
```ts
import { useEffect, useRef, type ReactNode } from 'react';
import type { ModelParams, OptionParams } from '../models/types';
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Component files | PascalCase.tsx | `PricePathPanel.tsx` |
| Logic/util files | camelCase.ts | `workerClient.ts` |
| Directories | lowercase plural | `components/`, `models/` |
| React components | PascalCase function | `export function PricePathPanel()` |
| Hooks | `use` prefix | `useDimensions`, `usePlayback` |
| Interfaces | PascalCase, no `I` prefix | `SimulationState`, `OptionParams` |
| Constants | SCREAMING_SNAKE_CASE | `BG_BASE`, `FAN_PATH_OPACITY` |
| Functions | camelCase | `computeOptionState`, `runSimulation` |
| Reducer actions | SCREAMING_SNAKE_CASE strings | `'SET_MODEL_PARAMS'` |

### Exports

- **Named exports only** — no default exports (except `App.tsx`)
- No barrel/index files — import from the specific file path

### Components

- Function declarations (`export function X()`), never arrow function components
- No `React.FC` or `React.FunctionComponent`
- Props interfaces defined inline above the component, named `{Component}Props`
- Destructured props in function signature

### Error Handling

- `console.error()` for async failures
- `try/catch` in Web Worker, errors posted back as string messages
- Promise `.then(resolve, reject)` style (not `.then().catch()`)
- Guard clauses with early returns: `if (!result || dims.width === 0) return;`
- Underscore prefix for unused required params: `_modelParams`

### Comments

- JSDoc `/** */` on exported functions — brief prose, no `@param`/`@returns` tags
- Section dividers: `// ---...---` in TS, `/* ---...--- */` in CSS
- Inline `//` for algorithmic notes

## Dual Color System

Colors are defined **twice** and must stay in sync:
- `src/theme.ts` — TypeScript constants imported by D3 panel code
- `src/index.css` — CSS custom properties used by component CSS

When changing a color, update both files.

## State Management

Single `SimulationContext` using React Context + `useReducer`:
- Discriminated union `Action` type for reducer
- `stateRef` pattern to avoid stale closures in async callbacks
- Context value: `{ state, dispatch, run, selectPath }`
- All panels/controls access context directly (no prop drilling)

## D3 Panel Pattern

All 5 panel components follow the same structure:

1. Module-level `MARGIN` constant
2. Hooks: `useSimulationContext()`, `useDimensions()`, `useRef<SVGSVGElement>`
3. Full-redraw `useEffect` on `[result, dims]`: guard → `svg.selectAll('*').remove()` → scales → axes → data → scrubber group → store scales in ref
4. Lightweight scrubber-update `useEffect` on `[currentStep, result]`: repositions scrubber elements only
5. JSX: `<PanelContainer>` → `<div ref={containerRef}>` → `<svg ref={svgRef}>`

D3 imported as namespace: `import * as d3 from 'd3'`.
Colors imported individually from `../../theme`.

## Web Worker Pattern

- `worker.ts`: `self.onmessage` handler, message types `'run'` | `'reprice'`
- `workerClient.ts`: Promise-based wrapper with ID-based request/response correlation
- Worker created with: `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`
- `Float64Array` used for path data (survives structured clone)

## Key Design Decisions

- **Precomputation**: All option states computed eagerly at every timestep during simulation. Scrubbing is O(1) array lookup.
- **IV vs model sigma**: `optionParams.iv` is the pricing volatility. It can be locked to `modelParams.sigma` (simulation vol) or set independently.
- **Expiry changes** invalidate paths (full re-sim). Strike/rate/type/style/IV changes only reprice along existing paths (fast).
- **No enums** — use `type X = 'a' | 'b'` with discriminated unions
- **No CSS modules** — plain CSS in `App.css` with BEM-like hyphenated classes
