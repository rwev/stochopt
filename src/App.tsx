import { useEffect } from 'react';
import {
  SimulationProvider,
  useSimulationContext,
} from './context/SimulationContext';
import { SimulationControls } from './components/controls/SimulationControls';
import { OptionControls } from './components/controls/OptionControls';
import { ActionBar } from './components/controls/ActionBar';
import { MetricsBar } from './components/controls/MetricsBar';
import { TimelineScrubber } from './components/controls/TimelineScrubber';
import { PricePathPanel } from './components/panels/PricePathPanel';
import { OptionPricePanel } from './components/panels/OptionPricePanel';
import { GreeksPanel } from './components/panels/GreeksPanel';
import { DistributionPanel } from './components/panels/DistributionPanel';
import { PayoffPanel } from './components/panels/PayoffPanel';
import './App.css';

/** Runs the simulation automatically on initial mount */
function AutoRun() {
  const { run } = useSimulationContext();
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function AppLayout() {
  const { state } = useSimulationContext();

  return (
    <div className="app">
      <AutoRun />

      <aside className="sidebar">
        <SimulationControls />
        <ActionBar />
        <OptionControls />
      </aside>

      <main className="main-area">
        {state.result ? (
          <>
            <div className="panels-grid">
              <div className="panel-main">
                <PricePathPanel />
              </div>
              <div className="panel-side-top">
                <DistributionPanel />
              </div>
              <div className="panel-bottom-left">
                <OptionPricePanel />
              </div>
              <div className="panel-bottom-center">
                <GreeksPanel />
              </div>
              <div className="panel-bottom-right">
                <PayoffPanel />
              </div>
            </div>
            <MetricsBar />
            <TimelineScrubber />
          </>
        ) : (
          <div className="empty-state">
            {state.isComputing
              ? 'Running simulation...'
              : 'Configure parameters and run simulation'}
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <SimulationProvider>
      <AppLayout />
    </SimulationProvider>
  );
}

export default App;
