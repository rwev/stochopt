import { useEffect, useRef } from 'react';
import { useSimulationContext } from '../context/SimulationContext';

/**
 * Drives the playback animation.
 * When `isPlaying` is true, advances `currentStep` at the configured speed
 * using requestAnimationFrame for smooth, frame-synced updates.
 */
export function usePlayback() {
  const { state, dispatch } = useSimulationContext();
  const lastTimestamp = useRef<number>(0);

  useEffect(() => {
    if (!state.isPlaying || !state.result) return;

    const numSteps = state.simulationParams.numSteps;
    let rafId: number;

    function tick(timestamp: number) {
      if (lastTimestamp.current === 0) {
        lastTimestamp.current = timestamp;
      }

      const elapsed = timestamp - lastTimestamp.current;
      const stepsToAdvance = (elapsed / 1000) * state.playbackSpeed;

      if (stepsToAdvance >= 1) {
        lastTimestamp.current = timestamp;

        const nextStep = state.currentStep + Math.floor(stepsToAdvance);
        if (nextStep >= numSteps) {
          dispatch({ type: 'SET_STEP', payload: numSteps });
          dispatch({ type: 'SET_PLAYING', payload: false });
          return;
        }
        dispatch({ type: 'SET_STEP', payload: nextStep });
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      lastTimestamp.current = 0;
    };
  }, [
    state.isPlaying,
    state.currentStep,
    state.playbackSpeed,
    state.result,
    state.simulationParams.numSteps,
    dispatch,
  ]);
}
