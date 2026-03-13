import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSimulationContext } from '../../context/SimulationContext';
import { useDimensions } from '../../hooks/useDimensions';
import { PanelContainer } from '../layout/PanelContainer';
import {
  CHART_GRID,
  CHART_AXIS,
  DATA_GREEN,
  DATA_INDIGO,
  DATA_VIOLET,
  DATA_AMBER,
  TEXT_PRIMARY,
  PANEL_ACCENTS,
} from '../../theme';

const MARGIN = { top: 12, right: 20, bottom: 30, left: 55 };

type ScaleLinear = d3.ScaleLinear<number, number, never>;

export function OptionPricePanel() {
  const { state } = useSimulationContext();
  const [containerRef, dims] = useDimensions();
  const svgRef = useRef<SVGSVGElement>(null);
  const scalesRef = useRef<{ x: ScaleLinear; y: ScaleLinear } | null>(null);

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

    const xScale = d3.scaleLinear().domain([0, T]).range([0, w]);

    let vMax = 0;
    for (const s of states) {
      if (s.price > vMax) vMax = s.price;
    }
    const yScale = d3
      .scaleLinear()
      .domain([0, vMax * 1.1])
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

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => `${d}y`))
      .attr('color', CHART_AXIS);
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.1f')))
      .attr('color', CHART_AXIS);

    const times = result.activePath.times;

    // Intrinsic value area
    const intrinsicArea = d3
      .area<number>()
      .x((_, i) => xScale(times[i]))
      .y0(h)
      .y1((_, i) => yScale(states[i].intrinsicValue));

    g.append('path')
      .datum(d3.range(states.length))
      .attr('d', intrinsicArea)
      .attr('fill', DATA_INDIGO)
      .attr('opacity', 0.12);

    // Intrinsic line
    const intrinsicLine = d3
      .line<number>()
      .x((_, i) => xScale(times[i]))
      .y((_, i) => yScale(states[i].intrinsicValue));

    g.append('path')
      .datum(d3.range(states.length))
      .attr('d', intrinsicLine)
      .attr('fill', 'none')
      .attr('stroke', DATA_INDIGO)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.6);

    // Time value area
    const timeValueArea = d3
      .area<number>()
      .x((_, i) => xScale(times[i]))
      .y0((_, i) => yScale(states[i].intrinsicValue))
      .y1((_, i) => yScale(states[i].price));

    g.append('path')
      .datum(d3.range(states.length))
      .attr('d', timeValueArea)
      .attr('fill', DATA_VIOLET)
      .attr('opacity', 0.1);

    // Total price line
    const priceLine = d3
      .line<number>()
      .x((_, i) => xScale(times[i]))
      .y((_, i) => yScale(states[i].price));

    g.append('path')
      .datum(d3.range(states.length))
      .attr('d', priceLine)
      .attr('fill', 'none')
      .attr('stroke', DATA_GREEN)
      .attr('stroke-width', 1.5);

    // Legend
    const legend = g.append('g').attr('transform', `translate(${w - 120}, 6)`);
    const items = [
      { label: 'Option Price', color: DATA_GREEN },
      { label: 'Intrinsic', color: DATA_INDIGO },
      { label: 'Time Value', color: DATA_VIOLET },
    ];
    items.forEach((item, i) => {
      const ly = i * 14;
      legend
        .append('line')
        .attr('x1', 0)
        .attr('x2', 12)
        .attr('y1', ly)
        .attr('y2', ly)
        .attr('stroke', item.color)
        .attr('stroke-width', 1.5);
      legend
        .append('text')
        .attr('x', 16)
        .attr('y', ly + 3)
        .attr('fill', TEXT_PRIMARY)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text(item.label);
    });

    g.append('g').attr('class', 'scrubber');
    scalesRef.current = { x: xScale, y: yScale };
  }, [result, dims]);

  // Scrubber update
  useEffect(() => {
    if (!result || !svgRef.current || !scalesRef.current) return;

    const { x: xScale, y: yScale } = scalesRef.current;
    const t = result.activePath.times[currentStep] ?? 0;
    const optState = result.optionStates[currentStep];
    if (!optState) return;

    const x = xScale(t);
    const h = dims.height - MARGIN.top - MARGIN.bottom;

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
      .attr('cy', yScale(optState.price))
      .attr('r', 3.5)
      .attr('fill', DATA_GREEN);

    scrubber
      .append('text')
      .attr('x', x)
      .attr('y', -3)
      .attr('fill', DATA_GREEN)
      .attr('font-size', '10px')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-weight', '600')
      .attr('text-anchor', 'middle')
      .text(optState.price.toFixed(2));
  }, [currentStep, result, dims]);

  return (
    <PanelContainer title="Option Value" className="panel-option-price" accent={PANEL_ACCENTS.optionPrice}>
      <div ref={containerRef} className="chart-container">
        <svg ref={svgRef} width={dims.width} height={dims.height} />
      </div>
    </PanelContainer>
  );
}
