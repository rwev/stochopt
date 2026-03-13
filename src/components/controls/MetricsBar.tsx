import { useSimulationContext } from '../../context/SimulationContext';
import {
  DATA_BLUE,
  DATA_GREEN,
  GREEK_COLORS,
  DATA_INDIGO,
  DATA_VIOLET,
} from '../../theme';

interface MetricProps {
  label: string;
  value: string;
  color: string;
}

function Metric({ label, value, color }: MetricProps) {
  return (
    <div className="metric-item">
      <span className="metric-label">{label}</span>
      <span className="metric-value" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export function MetricsBar() {
  const { state } = useSimulationContext();

  if (!state.result) return null;

  const step = state.currentStep;
  const optState = state.result.optionStates[step];
  const S = state.result.activePath.prices[step];

  if (!optState || S === undefined) return null;

  const g = optState.greeks;

  return (
    <div className="metrics-bar">
      <Metric label="Spot" value={S.toFixed(2)} color={DATA_BLUE} />
      <Metric label="Value" value={optState.price.toFixed(2)} color={DATA_GREEN} />
      <Metric label="Intrinsic" value={optState.intrinsicValue.toFixed(2)} color={DATA_INDIGO} />
      <Metric label="Time Val" value={optState.timeValue.toFixed(2)} color={DATA_VIOLET} />
      <Metric label="Delta" value={g.delta.toFixed(4)} color={GREEK_COLORS.delta} />
      <Metric label="Gamma" value={g.gamma.toFixed(4)} color={GREEK_COLORS.gamma} />
      <Metric label="Theta" value={g.theta.toFixed(4)} color={GREEK_COLORS.theta} />
      <Metric label="Vega" value={g.vega.toFixed(4)} color={GREEK_COLORS.vega} />
      <Metric label="Rho" value={g.rho.toFixed(4)} color={GREEK_COLORS.rho} />
    </div>
  );
}
