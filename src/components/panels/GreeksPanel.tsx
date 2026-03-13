import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useSimulationContext } from '../../context/SimulationContext';
import { useDimensions } from '../../hooks/useDimensions';
import { PanelContainer } from '../layout/PanelContainer';
import { formatGreek } from '../../utils/format';
import type { Greeks } from '../../models/types';
import {
  CHART_GRID,
  CHART_AXIS,
  CHART_ZERO_LINE,
  DATA_AMBER,
  GREEK_COLORS,
  PANEL_ACCENTS,
  TEXT_MUTED,
} from '../../theme';

const MARGIN = { top: 12, right: 20, bottom: 30, left: 55 };

type GreekKey = keyof Greeks;
type ScaleLinear = d3.ScaleLinear<number, number, never>;

const GREEK_META: Record<GreekKey, { label: string; color: string }> = {
  delta: { label: '\u0394 Delta', color: GREEK_COLORS.delta },
  gamma: { label: '\u0393 Gamma', color: GREEK_COLORS.gamma },
  theta: { label: '\u0398 Theta', color: GREEK_COLORS.theta },
  vega: { label: '\u03BD Vega', color: GREEK_COLORS.vega },
  rho: { label: '\u03C1 Rho', color: GREEK_COLORS.rho },
};

const GREEK_KEYS: GreekKey[] = ['delta', 'gamma', 'theta', 'vega', 'rho'];

export function GreeksPanel() {
  const { state } = useSimulationContext();
  const [containerRef, dims] = useDimensions();
  const svgRef = useRef<SVGSVGElement>(null);
  const scalesRef = useRef<{
    x: ScaleLinear;
    y: ScaleLinear;
    values: number[];
  } | null>(null);
  const [activeGreek, setActiveGreek] = useState<GreekKey>('delta');

  const { result, currentStep } = state;

  useEffect(() => {
    if (!result || dims.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const w = dims.width - MARGIN.left - MARGIN.right;
    const h = dims.height - MARGIN.top - MARGIN.bottom;
    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const T = result.optionParams.expiry;
    const states = result.optionStates;
    const times = result.activePath.times;
    const meta = GREEK_META[activeGreek];

    const values: number[] = states.map((s) => s.greeks[activeGreek]);

    const xScale = d3.scaleLinear().domain([0, T]).range([0, w]);
    let yMin = d3.min(values) ?? 0;
    let yMax = d3.max(values) ?? 0;
    const yPad = Math.max((yMax - yMin) * 0.1, 0.001);
    yMin -= yPad;
    yMax += yPad;
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

    // Grid
    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', w)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', CHART_GRID)
      .attr('stroke-width', 0.5);

    // Zero line
    if (yMin < 0 && yMax > 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', w)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', CHART_ZERO_LINE)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    }

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => `${d}y`))
      .attr('color', CHART_AXIS);
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .attr('color', CHART_AXIS);

    // Area
    const area = d3
      .area<number>()
      .x((_, i) => xScale(times[i]))
      .y0(yScale(0))
      .y1((_, i) => yScale(values[i]));

    g.append('path')
      .datum(d3.range(values.length))
      .attr('d', area)
      .attr('fill', meta.color)
      .attr('opacity', 0.08);

    // Line
    const line = d3
      .line<number>()
      .x((_, i) => xScale(times[i]))
      .y((_, i) => yScale(values[i]));

    g.append('path')
      .datum(d3.range(values.length))
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', meta.color)
      .attr('stroke-width', 1.5);

    g.append('g').attr('class', 'scrubber');
    scalesRef.current = { x: xScale, y: yScale, values };
  }, [result, dims, activeGreek]);

  // Scrubber update
  useEffect(() => {
    if (!result || !svgRef.current || !scalesRef.current) return;

    const { x: xScale, y: yScale, values } = scalesRef.current;
    const t = result.activePath.times[currentStep] ?? 0;
    const val = values[currentStep] ?? 0;
    const x = xScale(t);
    const h = dims.height - MARGIN.top - MARGIN.bottom;
    const meta = GREEK_META[activeGreek];

    const scrubber = d3.select(svgRef.current).select('.scrubber');
    scrubber.selectAll('*').remove();

    scrubber
      .append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', h)
      .attr('stroke', DATA_AMBER)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.6);

    scrubber
      .append('circle')
      .attr('cx', x)
      .attr('cy', yScale(val))
      .attr('r', 3.5)
      .attr('fill', meta.color);

    scrubber
      .append('text')
      .attr('x', x)
      .attr('y', -3)
      .attr('fill', meta.color)
      .attr('font-size', '10px')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-weight', '600')
      .attr('text-anchor', 'middle')
      .text(formatGreek(val));
  }, [currentStep, result, dims, activeGreek]);

  return (
    <PanelContainer title="Greeks" className="panel-greeks" accent={PANEL_ACCENTS.greeks}>
      <div className="greek-tabs">
        {GREEK_KEYS.map((key) => (
          <button
            key={key}
            className={`greek-tab ${activeGreek === key ? 'active' : ''}`}
            style={{
              borderBottomColor:
                activeGreek === key ? GREEK_META[key].color : 'transparent',
              color:
                activeGreek === key ? GREEK_META[key].color : TEXT_MUTED,
            }}
            onClick={() => setActiveGreek(key)}
          >
            {GREEK_META[key].label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="chart-container">
        <svg ref={svgRef} width={dims.width} height={dims.height} />
      </div>
    </PanelContainer>
  );
}
