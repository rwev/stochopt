import { useSimulationContext } from '../../context/SimulationContext';

export function ActionBar() {
  const { state, dispatch, run } = useSimulationContext();
  const sim = state.simulationParams;

  function randomizeSeed() {
    dispatch({
      type: 'SET_SIMULATION_PARAMS',
      payload: { ...sim, seed: Math.floor(Math.random() * 100000) },
    });
  }

  return (
    <div className="action-bar">
      <button className="run-button" onClick={run} disabled={state.isComputing}>
        Run
      </button>
      <button className="seed-button" onClick={randomizeSeed}>
        Rand
      </button>
      {state.isComputing && (
        <span className="computing-indicator">Computing...</span>
      )}
    </div>
  );
}
