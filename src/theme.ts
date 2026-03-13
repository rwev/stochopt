/**
 * Centralized color and typography constants for StochOpt.
 *
 * Used by D3 panel rendering code. CSS variables in index.css
 * mirror these values for the non-D3 styling.
 */

// ---------------------------------------------------------------------------
//  Backgrounds (4 depth levels)
// ---------------------------------------------------------------------------
export const BG_BASE = '#0b0e11';
export const BG_SURFACE = '#141820';
export const BG_ELEVATED = '#1a1f2b';
export const BG_OVERLAY = '#222837';

// ---------------------------------------------------------------------------
//  Borders
// ---------------------------------------------------------------------------
export const BORDER_SUBTLE = '#283040';
export const BORDER_DEFAULT = '#384258';

// ---------------------------------------------------------------------------
//  Text
// ---------------------------------------------------------------------------
export const TEXT_BRIGHT = '#f0f2f5';
export const TEXT_PRIMARY = '#d1d5db';
export const TEXT_SECONDARY = '#8b95a5';
export const TEXT_MUTED = '#606b7d';

// ---------------------------------------------------------------------------
//  Data colors — desaturated for professional extended viewing
// ---------------------------------------------------------------------------
export const DATA_BLUE = '#5b9cf6';
export const DATA_GREEN = '#40b66b';
export const DATA_RED = '#e5534b';
export const DATA_AMBER = '#cc8b17';
export const DATA_VIOLET = '#a78bfa';
export const DATA_INDIGO = '#7c8cf5';
export const DATA_CYAN = '#56d4dd';

// ---------------------------------------------------------------------------
//  Chart infrastructure
// ---------------------------------------------------------------------------
export const CHART_GRID = '#252d3a';
export const CHART_AXIS = '#4d5a6e';
export const CHART_AXIS_TEXT = '#7d8a9e';
export const CHART_ZERO_LINE = '#384258';

// Fan path
export const FAN_PATH_COLOR = DATA_BLUE;
export const FAN_PATH_OPACITY = 0.12;

// Active path
export const ACTIVE_PATH_COLOR = DATA_BLUE;
export const ACTIVE_PATH_OPACITY = 0.95;

// ---------------------------------------------------------------------------
//  Greek color map
// ---------------------------------------------------------------------------
export const GREEK_COLORS = {
  delta: DATA_BLUE,
  gamma: DATA_RED,
  theta: DATA_GREEN,
  vega: DATA_AMBER,
  rho: DATA_VIOLET,
} as const;

// ---------------------------------------------------------------------------
//  Panel accent colors (left border on panel headers)
// ---------------------------------------------------------------------------
export const PANEL_ACCENTS = {
  pricePath: DATA_BLUE,
  optionPrice: DATA_GREEN,
  greeks: DATA_CYAN,
  distribution: DATA_INDIGO,
  payoff: DATA_RED,
} as const;
