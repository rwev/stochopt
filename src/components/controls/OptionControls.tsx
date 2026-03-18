import { useState, useRef, useEffect } from 'react';
import { useSimulationContext } from '../../context/SimulationContext';
import type { OptionType } from '../../models/types';
import { NumberInput } from './NumberInput';
import { SelectInput } from './SelectInput';

// ---------------------------------------------------------------------------
//  Helpers for compact chain table
// ---------------------------------------------------------------------------

function fmtPrice(n: number): string {
  if (n === 0) return '\u2014';
  return n.toFixed(2);
}

function fmtIV(n: number): string {
  if (n === 0) return '\u2014';
  return (n * 100).toFixed(0);
}

function fmtExpiration(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

function computeDTE(iso: string): number {
  const expMs = new Date(iso + 'T16:00:00').getTime();
  return Math.max(0, Math.round((expMs - Date.now()) / (24 * 3600 * 1000)));
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export function OptionControls() {
  const { state, dispatch, loadChain, selectChainOption, clearChainOption } =
    useSimulationContext();
  const params = state.optionParams;
  const chain = state.optionChain;
  const sel = state.selectedChainOption;

  // --- Mode toggle (Manual / Market) ---
  const [intendedMode, setIntendedMode] = useState<'manual' | 'market'>(
    sel ? 'market' : 'manual',
  );
  const mode = sel ? 'market' : intendedMode;

  const [ticker, setTicker] = useState('');
  const chainBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to ATM when chain loads
  useEffect(() => {
    if (!chain || !chainBodyRef.current) return;
    const atmIdx = chain.strikes.findIndex((r) => r.strike >= chain.spotPrice);
    if (atmIdx < 0) return;
    const rows = chainBodyRef.current.querySelectorAll('.compact-chain-row');
    const target = rows[atmIdx] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, [chain]);

  function handleManual() {
    setIntendedMode('manual');
    if (sel) clearChainOption();
  }

  function handleMarket() {
    setIntendedMode('market');
  }

  function handleLoad() {
    const t = ticker.trim();
    if (!t) return;
    loadChain(t);
  }

  function handleTickerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLoad();
  }

  function handleExpirationChange(exp: string) {
    if (!chain) return;
    loadChain(chain.ticker, exp);
  }

  function handleSelectOption(strike: number, type: OptionType) {
    selectChainOption(strike, type);
  }

  function setParam(key: string, value: number | string) {
    dispatch({
      type: 'SET_OPTION_PARAMS',
      payload: { ...params, [key]: value },
    });
  }

  // IV lock toggle — hidden when in market mode
  const ivLockBtn =
    mode === 'market' ? undefined : (
      <button
        className={`iv-lock-btn ${state.ivLocked ? 'locked' : 'unlocked'}`}
        onClick={() =>
          dispatch({ type: 'SET_IV_LOCKED', payload: !state.ivLocked })
        }
        title={
          state.ivLocked
            ? 'IV locked to model \u03C3 \u2014 click to unlock'
            : 'IV independent \u2014 click to lock to model \u03C3'
        }
      >
        {state.ivLocked ? '\u03C3' : 'IV'}
      </button>
    );

  const dte = Math.round(params.expiry * 365);
  const chainLocked = sel !== null;

  // Chain source label
  const chainSource =
    chainLocked && chain
      ? `${chain.ticker} ${sel.type === 'call' ? 'C' : 'P'} ${sel.strike}`
      : null;

  // -----------------------------------------------------------------------
  //  Compact chain table (rendered in market mode)
  // -----------------------------------------------------------------------

  function renderCompactChain() {
    if (!chain) return null;

    return (
      <div className="compact-chain">
        {/* Toolbar: expiration + spot */}
        <div className="compact-chain-toolbar">
          <select
            className="chain-exp-select"
            value={chain.expiration}
            onChange={(e) => handleExpirationChange(e.target.value)}
            disabled={state.chainLoading}
          >
            {chain.expirations.map((exp) => (
              <option key={exp} value={exp}>
                {fmtExpiration(exp)} ({computeDTE(exp)}d)
              </option>
            ))}
          </select>
          <span className="compact-chain-spot">
            ${chain.spotPrice.toFixed(2)}
          </span>
        </div>

        {/* Column headers */}
        <div className="compact-chain-header">
          <span className="col-call">Call</span>
          <span className="col-call">IV</span>
          <span>Strike</span>
          <span className="col-put">IV</span>
          <span className="col-put">Put</span>
        </div>

        {/* Scrollable body */}
        <div className="compact-chain-body" ref={chainBodyRef}>
          {chain.strikes.map((row) => {
            const isATM =
              Math.abs(row.strike - chain.spotPrice) ===
              Math.min(
                ...chain.strikes.map((r) =>
                  Math.abs(r.strike - chain.spotPrice),
                ),
              );
            const isSelCall =
              sel?.strike === row.strike && sel?.type === 'call';
            const isSelPut =
              sel?.strike === row.strike && sel?.type === 'put';
            const callITM = row.strike < chain.spotPrice;
            const putITM = row.strike > chain.spotPrice;

            return (
              <div
                key={row.strike}
                className={`compact-chain-row${isATM ? ' atm' : ''}`}
              >
                {/* Call cell */}
                <div
                  className={`compact-chain-call${callITM ? ' itm' : ''}${isSelCall ? ' selected' : ''}${row.call ? '' : ' empty'}`}
                  onClick={() =>
                    row.call && handleSelectOption(row.strike, 'call')
                  }
                >
                  <span className="cc-price">
                    {row.call ? fmtPrice(row.call.lastPrice) : '\u2014'}
                  </span>
                </div>

                {/* Call IV */}
                <span className="cc-iv">
                  {row.call ? fmtIV(row.call.iv) : ''}
                </span>

                {/* Strike */}
                <span className="compact-chain-strike">
                  {row.strike.toFixed(0)}
                </span>

                {/* Put IV */}
                <span className="cc-iv">
                  {row.put ? fmtIV(row.put.iv) : ''}
                </span>

                {/* Put cell */}
                <div
                  className={`compact-chain-put${putITM ? ' itm' : ''}${isSelPut ? ' selected' : ''}${row.put ? '' : ' empty'}`}
                  onClick={() =>
                    row.put && handleSelectOption(row.strike, 'put')
                  }
                >
                  <span className="cc-price">
                    {row.put ? fmtPrice(row.put.lastPrice) : '\u2014'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  //  Render
  // -----------------------------------------------------------------------

  return (
    <div
      className={`control-group control-group-option${chainLocked ? ' chain-locked' : ''}`}
    >
      {/* --- Heading row --- */}
      <div className="control-group-header">
        <h3>
          Option
          {chainSource && (
            <span className="chain-source">
              {'\u00B7'} {chainSource}
            </span>
          )}
        </h3>

        <div className="option-header-right">
          {chainLocked && (
            <button
              className="chain-disconnect"
              onClick={handleManual}
              title="Disconnect from chain \u2014 resume manual input"
            >
              {'\u00D7'}
            </button>
          )}
          <div className="option-mode-toggle">
            <button
              className={`option-mode-btn${mode === 'manual' ? ' active' : ''}`}
              onClick={handleManual}
            >
              Manual
            </button>
            <button
              className={`option-mode-btn${mode === 'market' ? ' active' : ''}`}
              onClick={handleMarket}
            >
              Market
            </button>
          </div>
        </div>
      </div>

      {/* --- Market mode --- */}
      {mode === 'market' && (
        <>
          {/* Ticker row */}
          <div className="option-ticker-row">
            <input
              className="chain-ticker-input"
              type="text"
              placeholder="Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={handleTickerKeyDown}
            />
            <button
              className="chain-load-btn"
              onClick={handleLoad}
              disabled={state.chainLoading || !ticker.trim()}
            >
              {state.chainLoading ? '\u2026' : 'Load'}
            </button>
            {state.chainLoading && (
              <span className="chain-loading-indicator">Loading{'\u2026'}</span>
            )}
            {state.chainError && (
              <span className="chain-error-inline">{state.chainError}</span>
            )}
          </div>

          {/* Compact chain table */}
          {renderCompactChain()}
        </>
      )}

      {/* --- Manual mode: parameter grid --- */}
      {mode === 'manual' && (
        <div className="control-grid option-grid">
          <NumberInput
            label="Strike"
            value={params.strike}
            onChange={(v) => setParam('strike', v)}
            step={1}
            min={1}
          />
          <NumberInput
            label="Expiry"
            value={params.expiry}
            onChange={(v) => setParam('expiry', v)}
            step={0.25}
            min={0.05}
            suffix={`yrs | ${dte} DTE`}
          />
          <NumberInput
            label="Rate"
            value={+(params.riskFreeRate * 100).toFixed(4)}
            onChange={(v) => setParam('riskFreeRate', v / 100)}
            step={0.5}
            suffix="% / yr"
          />
          <NumberInput
            label="IV"
            value={+(params.iv * 100).toFixed(4)}
            onChange={(v) => setParam('iv', v / 100)}
            step={1}
            min={1}
            suffix="%"
            disabled={state.ivLocked}
            adornment={ivLockBtn}
          />
          <SelectInput
            label="Type"
            value={params.optionType}
            onChange={(v) => setParam('optionType', v)}
            options={[
              { value: 'call', label: 'Call' },
              { value: 'put', label: 'Put' },
            ]}
          />
          <SelectInput
            label="Style"
            value={params.optionStyle}
            onChange={(v) => setParam('optionStyle', v)}
            options={[
              { value: 'european', label: 'European' },
              { value: 'american', label: 'American' },
            ]}
          />
        </div>
      )}
    </div>
  );
}
