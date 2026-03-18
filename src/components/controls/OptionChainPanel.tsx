import { useState, useRef, useEffect } from 'react';
import { useSimulationContext } from '../../context/SimulationContext';
import type { OptionChainStrike, OptionType } from '../../models/types';

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function fmtPrice(n: number): string {
  if (n === 0) return '\u2014';
  return n.toFixed(2);
}

function fmtIV(n: number): string {
  if (n === 0) return '\u2014';
  return (n * 100).toFixed(1) + '%';
}

function fmtVol(n: number): string {
  if (n === 0) return '\u2014';
  if (n >= 10_000) return (n / 1000).toFixed(0) + 'k';
  if (n >= 1_000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(0);
}

function fmtOI(n: number): string {
  if (n === 0) return '\u2014';
  if (n >= 10_000) return (n / 1000).toFixed(0) + 'k';
  if (n >= 1_000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(0);
}

function fmtExpiration(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function computeDTE(iso: string): number {
  const expMs = new Date(iso + 'T16:00:00').getTime();
  return Math.max(0, Math.round((expMs - Date.now()) / (24 * 3600 * 1000)));
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export function OptionChainPanel() {
  const {
    state,
    loadChain,
    selectChainOption,
    clearChainOption,
  } = useSimulationContext();

  const { optionChain, chainLoading, chainError, selectedChainOption } = state;

  const [expanded, setExpanded] = useState(false);
  const [ticker, setTicker] = useState('');
  const tableBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to ATM strike when chain loads
  useEffect(() => {
    if (!optionChain || !tableBodyRef.current) return;
    const atmIdx = optionChain.strikes.findIndex(
      (r) => r.strike >= optionChain.spotPrice,
    );
    if (atmIdx < 0) return;
    const rows = tableBodyRef.current.querySelectorAll('.chain-row');
    const target = rows[atmIdx] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, [optionChain]);

  function handleLoad() {
    const t = ticker.trim();
    if (!t) return;
    // Auto-expand when loading for the first time
    if (!optionChain) setExpanded(true);
    loadChain(t);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLoad();
  }

  function handleExpirationChange(exp: string) {
    if (!optionChain) return;
    loadChain(optionChain.ticker, exp);
  }

  function handleSelectOption(strike: number, type: OptionType) {
    selectChainOption(strike, type);
  }

  // -----------------------------------------------------------------------
  //  Collapsed summary bar (always visible when chain is loaded)
  // -----------------------------------------------------------------------

  function renderSummary() {
    if (!optionChain) {
      return (
        <div className="chain-summary">
          <div className="chain-summary-empty">
            <input
              className="chain-ticker-input"
              type="text"
              placeholder="Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
            />
            <button
              className="chain-load-btn"
              onClick={handleLoad}
              disabled={chainLoading || !ticker.trim()}
            >
              {chainLoading ? 'Loading\u2026' : 'Load Chain'}
            </button>
            {chainError && (
              <span className="chain-error-inline">{chainError}</span>
            )}
          </div>
        </div>
      );
    }

    const dte = computeDTE(optionChain.expiration);

    return (
      <div className="chain-summary">
        <span className="chain-summary-ticker">{optionChain.ticker}</span>
        <span className="chain-summary-spot">
          ${optionChain.spotPrice.toFixed(2)}
        </span>
        <span className="chain-summary-sep">{'\u2502'}</span>
        <span className="chain-summary-exp">
          {fmtExpiration(optionChain.expiration)} ({dte} DTE)
        </span>

        {selectedChainOption && (
          <>
            <span className="chain-summary-sep">{'\u2502'}</span>
            <span className="chain-summary-selection">
              {selectedChainOption.type === 'call' ? 'Call' : 'Put'}{' '}
              {selectedChainOption.strike}
              {(() => {
                const row = optionChain.strikes.find(
                  (r) => r.strike === selectedChainOption.strike,
                );
                const entry = row
                  ? selectedChainOption.type === 'call'
                    ? row.call
                    : row.put
                  : null;
                if (!entry) return '';
                return ` @ $${entry.lastPrice.toFixed(2)}  IV ${(entry.iv * 100).toFixed(1)}%`;
              })()}
            </span>
            <button className="chain-clear-btn" onClick={clearChainOption}>
              Clear
            </button>
          </>
        )}

        <div className="chain-summary-actions">
          {chainLoading && (
            <span className="chain-loading-indicator">Loading\u2026</span>
          )}
          <button
            className="chain-toggle-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '\u25B2' : '\u25BC'}
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  //  Expanded chain table
  // -----------------------------------------------------------------------

  function renderStrikeRow(row: OptionChainStrike) {
    const isATM =
      optionChain &&
      Math.abs(row.strike - optionChain.spotPrice) ===
        Math.min(
          ...optionChain.strikes.map((r) =>
            Math.abs(r.strike - optionChain.spotPrice),
          ),
        );

    const isSelectedCall =
      selectedChainOption?.strike === row.strike &&
      selectedChainOption?.type === 'call';
    const isSelectedPut =
      selectedChainOption?.strike === row.strike &&
      selectedChainOption?.type === 'put';

    const callITM = optionChain ? row.strike < optionChain.spotPrice : false;
    const putITM = optionChain ? row.strike > optionChain.spotPrice : false;

    return (
      <div
        key={row.strike}
        className={`chain-row${isATM ? ' atm' : ''}`}
      >
        {/* Call side */}
        <div
          className={`chain-side call${callITM ? ' itm' : ''}${isSelectedCall ? ' selected' : ''}${row.call ? '' : ' empty'}`}
          onClick={() => row.call && handleSelectOption(row.strike, 'call')}
        >
          {row.call ? (
            <>
              <span className="chain-cell last">{fmtPrice(row.call.lastPrice)}</span>
              <span className="chain-cell bid">{fmtPrice(row.call.bidPrice)}</span>
              <span className="chain-cell ask">{fmtPrice(row.call.askPrice)}</span>
              <span className="chain-cell iv">{fmtIV(row.call.iv)}</span>
              <span className="chain-cell vol">{fmtVol(row.call.volume)}</span>
              <span className="chain-cell oi">{fmtOI(row.call.openInterest)}</span>
            </>
          ) : (
            <span className="chain-cell empty-cell">{'\u2014'}</span>
          )}
        </div>

        {/* Strike center */}
        <div className="chain-strike">{row.strike.toFixed(2)}</div>

        {/* Put side */}
        <div
          className={`chain-side put${putITM ? ' itm' : ''}${isSelectedPut ? ' selected' : ''}${row.put ? '' : ' empty'}`}
          onClick={() => row.put && handleSelectOption(row.strike, 'put')}
        >
          {row.put ? (
            <>
              <span className="chain-cell last">{fmtPrice(row.put.lastPrice)}</span>
              <span className="chain-cell bid">{fmtPrice(row.put.bidPrice)}</span>
              <span className="chain-cell ask">{fmtPrice(row.put.askPrice)}</span>
              <span className="chain-cell iv">{fmtIV(row.put.iv)}</span>
              <span className="chain-cell vol">{fmtVol(row.put.volume)}</span>
              <span className="chain-cell oi">{fmtOI(row.put.openInterest)}</span>
            </>
          ) : (
            <span className="chain-cell empty-cell">{'\u2014'}</span>
          )}
        </div>
      </div>
    );
  }

  function renderTable() {
    if (!optionChain) return null;

    return (
      <div className="chain-expanded">
        {/* Toolbar */}
        <div className="chain-toolbar">
          <input
            className="chain-ticker-input"
            type="text"
            placeholder="Ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
          />
          <button
            className="chain-load-btn"
            onClick={handleLoad}
            disabled={chainLoading || !ticker.trim()}
          >
            {chainLoading ? '\u2026' : 'Load'}
          </button>

          <div className="chain-toolbar-sep" />

          <label className="chain-exp-label">Exp</label>
          <select
            className="chain-exp-select"
            value={optionChain.expiration}
            onChange={(e) => handleExpirationChange(e.target.value)}
            disabled={chainLoading}
          >
            {optionChain.expirations.map((exp) => {
              const dte = computeDTE(exp);
              return (
                <option key={exp} value={exp}>
                  {fmtExpiration(exp)} ({dte}d)
                </option>
              );
            })}
          </select>

          <div className="chain-toolbar-sep" />

          <span className="chain-spot-label">
            Spot: <strong>${optionChain.spotPrice.toFixed(2)}</strong>
          </span>

          {chainError && (
            <span className="chain-error-inline">{chainError}</span>
          )}
        </div>

        {/* Table header */}
        <div className="chain-table-header">
          <div className="chain-side-header call-header">
            <span>CALLS</span>
            <div className="chain-col-labels">
              <span>Last</span>
              <span>Bid</span>
              <span>Ask</span>
              <span>IV</span>
              <span>Vol</span>
              <span>OI</span>
            </div>
          </div>
          <div className="chain-strike-header">Strike</div>
          <div className="chain-side-header put-header">
            <span>PUTS</span>
            <div className="chain-col-labels">
              <span>Last</span>
              <span>Bid</span>
              <span>Ask</span>
              <span>IV</span>
              <span>Vol</span>
              <span>OI</span>
            </div>
          </div>
        </div>

        {/* Table body (scrollable) */}
        <div className="chain-table-body" ref={tableBodyRef}>
          {optionChain.strikes.map(renderStrikeRow)}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  //  Render
  // -----------------------------------------------------------------------

  return (
    <div className="chain-panel">
      {renderSummary()}
      {expanded && renderTable()}
    </div>
  );
}
