/**
 * Fetches option chain data from barchart.com via the Vite dev proxy.
 *
 * API endpoints used (proxied through /api/barchart → core-api/v1):
 *   - /quotes/get          — spot price for the underlying
 *   - /options/get          — discover available expiration dates
 *   - /options/chain        — full chain for a single expiration
 */

import type {
  OptionChain,
  OptionChainEntry,
  OptionChainStrike,
} from '../models/types';

// ---------------------------------------------------------------------------
//  Barchart raw response shapes
// ---------------------------------------------------------------------------

interface BarchartRawEntry {
  [key: string]: unknown;
}

interface BarchartResponse {
  count?: number;
  total?: number;
  data?: (BarchartRawEntry | { raw: BarchartRawEntry })[];
  error?: { message: string; code: number } | string;
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

const BASE_URL = '/api/barchart';

const CHAIN_FIELDS = [
  'strikePrice',
  'lastPrice',
  'bidPrice',
  'askPrice',
  'openInterest',
  'volume',
  'volatility',
  'delta',
  'optionType',
  'expirationDate',
  'daysToExpiration',
].join(',');

/** Coerce a value to number, treating null/NaN/undefined as 0 */
function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Extract the `raw` object from a barchart entry (handles nested + flat) */
function unwrap(d: BarchartRawEntry | { raw: BarchartRawEntry }): BarchartRawEntry {
  if ('raw' in d && d.raw && typeof d.raw === 'object') {
    return d.raw as BarchartRawEntry;
  }
  return d as BarchartRawEntry;
}

async function fetchJSON(path: string): Promise<BarchartResponse> {
  const url = `${BASE_URL}/${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Barchart API ${res.status}: ${text.slice(0, 200) || res.statusText}`,
    );
  }

  const json: BarchartResponse = await res.json();

  if (json.error) {
    const msg =
      typeof json.error === 'string'
        ? json.error
        : json.error.message ?? 'Unknown error';
    throw new Error(`Barchart: ${msg}`);
  }

  return json;
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the spot price and all available expiration dates for a ticker.
 *
 * Uses two endpoints in parallel:
 *   - /quotes/get for the spot price
 *   - /options/get (paginated) for expiration dates
 */
export async function fetchExpirations(
  ticker: string,
): Promise<{ expirations: string[]; spotPrice: number }> {
  const symbol = encodeURIComponent(ticker.toUpperCase());

  // Fetch spot price + 3 pages of options data (to discover all expirations)
  const [quoteRes, ...optPages] = await Promise.all([
    fetchJSON(`quotes/get?symbol=${symbol}&fields=lastPrice&raw=1`),
    fetchJSON(`options/get?underlying=${symbol}&fields=expirationDate&raw=1&limit=1000&page=1`),
    fetchJSON(`options/get?underlying=${symbol}&fields=expirationDate&raw=1&limit=1000&page=2`),
    fetchJSON(`options/get?underlying=${symbol}&fields=expirationDate&raw=1&limit=1000&page=3`),
  ]);

  // Spot price
  const quoteItems = (quoteRes.data ?? []).map(unwrap);
  const spotPrice = quoteItems.length > 0 ? num(quoteItems[0].lastPrice) : 0;

  if (!spotPrice) {
    throw new Error(`Could not get spot price for ${ticker.toUpperCase()}`);
  }

  // Expirations (deduplicate from all pages)
  const expirationSet = new Set<string>();
  for (const page of optPages) {
    for (const entry of (page.data ?? []).map(unwrap)) {
      const exp = String(entry.expirationDate ?? '');
      if (exp && exp.includes('-')) expirationSet.add(exp);
    }
  }

  const expirations = Array.from(expirationSet).sort();

  if (expirations.length === 0) {
    throw new Error(`No expirations found for ${ticker.toUpperCase()}`);
  }

  return { expirations, spotPrice };
}

/** Find the expiration date closest to a target time-to-expiry (in years) */
export function closestExpiration(
  expirations: string[],
  targetYears: number,
): string {
  const now = Date.now();
  let best = expirations[0];
  let bestDiff = Infinity;

  for (const exp of expirations) {
    const expMs = new Date(exp + 'T16:00:00').getTime();
    const dteYears = Math.max(0, (expMs - now) / (365.25 * 24 * 3600 * 1000));
    const diff = Math.abs(dteYears - targetYears);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = exp;
    }
  }

  return best;
}

/** Fetch the full option chain for a specific expiration date */
export async function fetchOptionChain(
  ticker: string,
  expiration: string,
  allExpirations: string[],
): Promise<OptionChain> {
  const symbol = ticker.toUpperCase();

  // Fetch chain and spot price in parallel
  const [chainRes, quoteRes] = await Promise.all([
    fetchJSON(
      `options/chain?symbol=${encodeURIComponent(symbol)}&fields=${CHAIN_FIELDS}&expirationDate=${expiration}&raw=1`,
    ),
    fetchJSON(
      `quotes/get?symbol=${encodeURIComponent(symbol)}&fields=lastPrice&raw=1`,
    ),
  ]);

  const items = (chainRes.data ?? []).map(unwrap);

  if (items.length === 0) {
    throw new Error(`No chain data for ${symbol} expiring ${expiration}`);
  }

  // Spot price from quote
  const quoteItems = (quoteRes.data ?? []).map(unwrap);
  const spotPrice = quoteItems.length > 0 ? num(quoteItems[0].lastPrice) : 0;

  // Group entries by strike
  const strikeMap = new Map<
    number,
    { call: OptionChainEntry | null; put: OptionChainEntry | null }
  >();
  let dte = 0;

  for (const item of items) {
    if (!dte && item.daysToExpiration) dte = num(item.daysToExpiration);

    const strike = num(item.strikePrice);
    if (strike <= 0) continue;

    const entry: OptionChainEntry = {
      strike,
      lastPrice: num(item.lastPrice),
      bidPrice: num(item.bidPrice),
      askPrice: num(item.askPrice),
      volume: num(item.volume),
      openInterest: num(item.openInterest),
      iv: num(item.volatility) / 100, // barchart returns raw percentage
      delta: num(item.delta),
    };

    if (!strikeMap.has(strike)) {
      strikeMap.set(strike, { call: null, put: null });
    }

    const row = strikeMap.get(strike)!;
    const optType = String(item.optionType ?? '').toLowerCase();
    if (optType === 'call') {
      row.call = entry;
    } else if (optType === 'put') {
      row.put = entry;
    }
  }

  const strikes: OptionChainStrike[] = Array.from(strikeMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([strike, { call, put }]) => ({ strike, call, put }));

  return {
    ticker: symbol,
    spotPrice,
    expiration,
    daysToExpiration: dte,
    expirations: allExpirations,
    strikes,
  };
}
