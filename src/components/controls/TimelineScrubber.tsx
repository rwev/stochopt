import { useSimulationContext } from '../../context/SimulationContext';
import { usePlayback } from '../../hooks/usePlayback';

export function TimelineScrubber() {
  const { state, dispatch } = useSimulationContext();
  usePlayback();

  if (!state.result) return null;

  const numSteps = state.simulationParams.numSteps;
  const t = state.result.activePath.times[state.currentStep] ?? 0;
  const T = state.optionParams.expiry;
  const dte = Math.max(0, Math.round((T - t) * 365));

  return (
    <div className="timeline-scrubber">
      <button
        className="playback-btn"
        onClick={() => {
          if (state.currentStep >= numSteps) {
            dispatch({ type: 'SET_STEP', payload: 0 });
          }
          dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying });
        }}
      >
        {state.isPlaying ? '\u275A\u275A' : '\u25B6'}
      </button>
      <button
        className="playback-btn"
        onClick={() => {
          dispatch({ type: 'SET_PLAYING', payload: false });
          dispatch({ type: 'SET_STEP', payload: 0 });
        }}
      >
        \u25A0
      </button>
      <input
        type="range"
        className="scrubber-slider"
        min={0}
        max={numSteps}
        value={state.currentStep}
        onChange={(e) => {
          dispatch({ type: 'SET_PLAYING', payload: false });
          dispatch({ type: 'SET_STEP', payload: +e.target.value });
        }}
      />
      <span className="scrubber-time">
        t = {t.toFixed(2)}y &middot; {dte} DTE
      </span>
      <label className="speed-control">
        Speed
        <select
          value={state.playbackSpeed}
          onChange={(e) =>
            dispatch({ type: 'SET_SPEED', payload: +e.target.value })
          }
        >
          <option value={10}>Slow</option>
          <option value={30}>Normal</option>
          <option value={80}>Fast</option>
          <option value={200}>Very Fast</option>
        </select>
      </label>
    </div>
  );
}
