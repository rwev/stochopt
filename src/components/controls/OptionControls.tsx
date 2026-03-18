import { useSimulationContext } from '../../context/SimulationContext';
import { NumberInput } from './NumberInput';
import { SelectInput } from './SelectInput';

export function OptionControls() {
  const { state, dispatch } = useSimulationContext();
  const params = state.optionParams;
  const chainLocked = state.selectedChainOption !== null;

  function setParam(key: string, value: number | string) {
    dispatch({
      type: 'SET_OPTION_PARAMS',
      payload: { ...params, [key]: value },
    });
  }

  const ivLockBtn = chainLocked ? undefined : (
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

  // DTE display: compute from expiry in years
  const dte = Math.round(params.expiry * 365);

  return (
    <div className="control-group">
      <h3>
        Option
        {chainLocked && <span className="chain-badge">CHAIN</span>}
      </h3>
      <div className="control-grid option-grid">
        <NumberInput
          label="Strike"
          value={params.strike}
          onChange={(v) => setParam('strike', v)}
          step={1}
          min={1}
          disabled={chainLocked}
        />
        <NumberInput
          label="Expiry"
          value={params.expiry}
          onChange={(v) => setParam('expiry', v)}
          step={0.25}
          min={0.05}
          suffix={`yrs | ${dte} DTE`}
          disabled={chainLocked}
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
          disabled={chainLocked || state.ivLocked}
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
          disabled={chainLocked}
        />
        <SelectInput
          label="Style"
          value={params.optionStyle}
          onChange={(v) => setParam('optionStyle', v)}
          options={[
            { value: 'european', label: 'European' },
            { value: 'american', label: 'American' },
          ]}
          disabled={chainLocked}
        />
      </div>
    </div>
  );
}
