import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSimulationContext } from '../../context/SimulationContext';
import { useDimensions } from '../../hooks/useDimensions';
import { PanelContainer } from '../layout/PanelContainer';
import {
  CHART_GRID,
  CHART_AXIS,
  CHART_ZERO_LINE,
  DATA_GREEN,
  DATA_RED,
  DATA_AMBER,
  TEXT_MUTED,
  PANEL_ACCENTS,
} from '../../theme';

const MARGIN = { top: 12, right: 20, bottom: 30, left: 55 };

export function PayoffPanel() {
  const { state } = useSimulationContext();
  const [containerRef, dims] = useDimensions();
  const svgRef = useRef<SVGSVGElement>(null);

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

    const K = result.optionParams.strike;
    const type = result.optionParams.optionType;
    const premium = result.optionStates[0].price;
    const St = result.activePath.prices[currentStep] ?? result.modelParams.s0;

    const sMin = K * 0.6;
    const sMax = K * 1.4;
    const xScale = d3.scaleLinear().domain([sMin, sMax]).range([0, w]);

    // Payoff data
    const nPoints = 200;
    const ds = (sMax - sMin) / nPoints;
    const payoffData: [number, number][] = [];
    let plMin = 0;
    let plMax = 0;

    for (let i = 0; i <= nPoints; i++) {
      const s = sMin + i * ds;
      const intrinsic =
        type === 'call' ? Math.max(s - K, 0) : Math.max(K - s, 0);
      const pl = intrinsic - premium;
      payoffData.push([s, pl]);
      if (pl < plMin) plMin = pl;
      if (pl > plMax) plMax = pl;
    }

    const yPad = Math.max((plMax - plMin) * 0.1, 1);
    const yScale = d3
      .scaleLinear()
      .domain([plMin - yPad, plMax + yPad])
      .range([h, 0]);

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

    // Zero P&L line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', w)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', CHART_ZERO_LINE)
      .attr('stroke-width', 1);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.0f')))
      .attr('color', CHART_AXIS);
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.1f')))
      .attr('color', CHART_AXIS);

    // Profit area
    const profitArea = d3
      .area<[number, number]>()
      .x((d) => xScale(d[0]))
      .y0(yScale(0))
      .y1((d) => yScale(Math.max(d[1], 0)));

    const lossArea = d3
      .area<[number, number]>()
      .x((d) => xScale(d[0]))
      .y0(yScale(0))
      .y1((d) => yScale(Math.min(d[1], 0)));

    g.append('path')
      .datum(payoffData)
      .attr('d', profitArea)
      .attr('fill', DATA_GREEN)
      .attr('opacity', 0.08);

    g.append('path')
      .datum(payoffData)
      .attr('d', lossArea)
      .attr('fill', DATA_RED)
      .attr('opacity', 0.08);

    // Payoff line
    const payoffLine = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    g.append('path')
      .datum(payoffData)
      .attr('d', payoffLine)
      .attr('fill', 'none')
      .attr('stroke', DATA_GREEN)
      .attr('stroke-width', 1.5);

    // Strike marker
    g.append('line')
      .attr('x1', xScale(K))
      .attr('x2', xScale(K))
      .attr('y1', 0)
      .attr('y2', h)
      .attr('stroke', DATA_RED)
      .attr('stroke-dasharray', '5,4')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6);

    // Current spot marker
    const scrubberGroup = g.append('g').attr('class', 'scrubber');
    if (St >= sMin && St <= sMax) {
      const intrinsicNow =
        type === 'call' ? Math.max(St - K, 0) : Math.max(K - St, 0);
      const plNow = intrinsicNow - premium;

      scrubberGroup
        .append('line')
        .attr('x1', xScale(St))
        .attr('x2', xScale(St))
        .attr('y1', 0)
        .attr('y2', h)
        .attr('stroke', DATA_AMBER)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.6);

      scrubberGroup
        .append('circle')
        .attr('cx', xScale(St))
        .attr('cy', yScale(plNow))
        .attr('r', 4)
        .attr('fill', plNow >= 0 ? DATA_GREEN : DATA_RED);

      scrubberGroup
        .append('text')
        .attr('x', xScale(St))
        .attr('y', -3)
        .attr('fill', DATA_AMBER)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', '600')
        .attr('text-anchor', 'middle')
        .text(St.toFixed(1));
    }

    // Premium label
    g.append('text')
      .attr('x', 4)
      .attr('y', 10)
      .attr('fill', TEXT_MUTED)
      .attr('font-size', '10px')
      .attr('font-family', "'JetBrains Mono', monospace")
      .text(`Premium: ${premium.toFixed(2)}`);
  }, [result, dims, currentStep]);

  return (
    <PanelContainer title="Payoff at Expiry" className="panel-payoff" accent={PANEL_ACCENTS.payoff}>
      <div ref={containerRef} className="chart-container">
        <svg ref={svgRef} width={dims.width} height={dims.height} />
      </div>
    </PanelContainer>
  );
}
