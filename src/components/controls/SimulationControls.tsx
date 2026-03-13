import { useSimulationContext } from '../../context/SimulationContext';
import type { ModelType, GBMParams, MertonParams } from '../../models/types';
import { NumberInput } from './NumberInput';
import { SelectInput } from './SelectInput';

export function SimulationControls() {
  const { state, dispatch, run } = useSimulationContext();
  const model = state.modelParams;
  const sim = state.simulationParams;

  function setModelParam(key: string, value: number | string) {
    if (key === 'type') {
      const newType = value as ModelType;
      if (newType === 'gbm') {
        dispatch({
          type: 'SET_MODEL_PARAMS',
          payload: { type: 'gbm', s0: model.s0, mu: model.mu, sigma: model.sigma },
        });
      } else {
        const prev = model as GBMParams;
        dispatch({
          type: 'SET_MODEL_PARAMS',
          payload: {
            type: 'merton',
            s0: prev.s0,
            mu: prev.mu,
            sigma: prev.sigma,
            lambda: 1.0,
            muJ: -0.05,
            sigmaJ: 0.1,
          } as MertonParams,
        });
      }
    } else {
      dispatch({
        type: 'SET_MODEL_PARAMS',
        payload: { ...model, [key]: value } as typeof model,
      });
    }
  }

  function setSimParam(key: string, value: number) {
    dispatch({
      type: 'SET_SIMULATION_PARAMS',
      payload: { ...sim, [key]: value },
    });
  }

  return (
    <div className="control-group">
      <h3>Simulation</h3>
      <div className="control-grid sim-grid">
        <SelectInput
          label="Model"
          value={model.type}
          onChange={(v) => setModelParam('type', v)}
          options={[
            { value: 'gbm', label: 'GBM' },
            { value: 'merton', label: 'Merton' },
          ]}
        />
        <NumberInput
          label="S₀"
          value={model.s0}
          onChange={(v) => setModelParam('s0', v)}
          step={1}
          min={1}
        />
        <NumberInput
          label="μ"
          value={+(model.mu * 100).toFixed(4)}
          onChange={(v) => setModelParam('mu', v / 100)}
          step={1}
          suffix="% / yr"
        />
        <NumberInput
          label="σ"
          value={+(model.sigma * 100).toFixed(4)}
          onChange={(v) => setModelParam('sigma', v / 100)}
          step={1}
          min={1}
          suffix="% / yr"
        />
        {model.type === 'merton' && (
          <>
            <NumberInput
              label="λ"
              value={(model as MertonParams).lambda}
              onChange={(v) => setModelParam('lambda', v)}
              step={0.1}
              min={0}
              suffix="/ yr"
            />
            <NumberInput
              label="μ_J"
              value={+((model as MertonParams).muJ * 100).toFixed(4)}
              onChange={(v) => setModelParam('muJ', v / 100)}
              step={1}
              suffix="%"
            />
            <NumberInput
              label="σ_J"
              value={+((model as MertonParams).sigmaJ * 100).toFixed(4)}
              onChange={(v) => setModelParam('sigmaJ', v / 100)}
              step={1}
              min={1}
              suffix="%"
            />
          </>
        )}
        <NumberInput
          label="Paths"
          value={sim.numPaths}
          onChange={(v) => setSimParam('numPaths', v)}
          step={10}
          min={10}
          max={500}
        />
        <NumberInput
          label="Steps"
          value={sim.numSteps}
          onChange={(v) => setSimParam('numSteps', v)}
          step={50}
          min={50}
          max={1000}
        />
        <NumberInput
          label="Seed"
          value={sim.seed}
          onChange={(v) => setSimParam('seed', v)}
          step={1}
        />
        <div className="control-actions">
          <button className="run-button" onClick={run} disabled={state.isComputing}>
            Run
          </button>
          <button
            className="seed-button"
            onClick={() => setSimParam('seed', Math.floor(Math.random() * 100000))}
          >
            Rand
          </button>
          {state.isComputing && (
            <span className="computing-indicator">Computing...</span>
          )}
        </div>
      </div>
    </div>
  );
}
