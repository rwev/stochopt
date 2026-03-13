import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSimulationContext } from '../../context/SimulationContext';
import { useDimensions } from '../../hooks/useDimensions';
import { PanelContainer } from '../layout/PanelContainer';
import {
  CHART_GRID,
  CHART_AXIS,
  DATA_RED,
  DATA_AMBER,
  BG_BASE,
  FAN_PATH_COLOR,
  FAN_PATH_OPACITY,
  ACTIVE_PATH_COLOR,
  ACTIVE_PATH_OPACITY,
  PANEL_ACCENTS,
} from '../../theme';

const MARGIN = { top: 12, right: 20, bottom: 30, left: 55 };

type ScaleLinear = d3.ScaleLinear<number, number, never>;

export function PricePathPanel() {
  const { state, dispatch, selectPath } = useSimulationContext();
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

    const xScale = d3
      .scaleLinear()
      .domain([0, result.optionParams.expiry])
      .range([0, w]);

    let pMin = Infinity;
    let pMax = -Infinity;
    for (const path of result.paths) {
      for (let i = 0; i < path.prices.length; i++) {
        if (path.prices[i] < pMin) pMin = path.prices[i];
        if (path.prices[i] > pMax) pMax = path.prices[i];
      }
    }
    const pad = (pMax - pMin) * 0.05;
    const yScale = d3
      .scaleLinear()
      .domain([pMin - pad, pMax + pad])
      .range([h, 0]);

    // Grid
    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(6))
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
      .call(d3.axisBottom(xScale).ticks(8).tickFormat((d) => `${d}y`))
      .attr('color', CHART_AXIS);

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format('.0f')))
      .attr('color', CHART_AXIS);

    // Strike line
    const K = result.optionParams.strike;
    if (K >= pMin - pad && K <= pMax + pad) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', w)
        .attr('y1', yScale(K))
        .attr('y2', yScale(K))
        .attr('stroke', DATA_RED)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', w - 4)
        .attr('y', yScale(K) - 5)
        .attr('fill', DATA_RED)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('text-anchor', 'end')
        .attr('opacity', 0.8)
        .text(`K = ${K}`);
    }

    // Line generator
    const line = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    // Fan paths
    const fanGroup = g.append('g');
    for (let p = 0; p < result.paths.length; p++) {
      if (p === result.activePathIndex) continue;
      const path = result.paths[p];
      const data: [number, number][] = [];
      for (let i = 0; i < path.times.length; i++) {
        data.push([path.times[i], path.prices[i]]);
      }
      fanGroup
        .append('path')
        .datum(data)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', FAN_PATH_COLOR)
        .attr('stroke-width', 0.5)
        .attr('opacity', FAN_PATH_OPACITY)
        .style('pointer-events', 'none');
    }

    // Active path
    const activePath = result.activePath;
    const activeData: [number, number][] = [];
    for (let i = 0; i < activePath.times.length; i++) {
      activeData.push([activePath.times[i], activePath.prices[i]]);
    }
    g.append('path')
      .datum(activeData)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', ACTIVE_PATH_COLOR)
      .attr('stroke-width', 1.5)
      .attr('opacity', ACTIVE_PATH_OPACITY);

    // Jump markers (Merton)
    if (activePath.jumpIndices && activePath.jumpIndices.length > 0) {
      g.selectAll('.jump-marker')
        .data(activePath.jumpIndices)
        .join('circle')
        .attr('class', 'jump-marker')
        .attr('cx', (i) => xScale(activePath.times[i]))
        .attr('cy', (i) => yScale(activePath.prices[i]))
        .attr('r', 3)
        .attr('fill', DATA_AMBER)
        .attr('stroke', BG_BASE)
        .attr('stroke-width', 1);
    }

    // Scrubber group
    const scrubberGroup = g.append('g').attr('class', 'scrubber');
    scrubberGroup
      .append('line')
      .attr('class', 'scrubber-line')
      .attr('y1', 0)
      .attr('y2', h)
      .attr('stroke', DATA_AMBER)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.7);

    scrubberGroup
      .append('circle')
      .attr('class', 'scrubber-dot')
      .attr('r', 4)
      .attr('fill', DATA_AMBER)
      .attr('stroke', BG_BASE)
      .attr('stroke-width', 1.5);

    scrubberGroup
      .append('text')
      .attr('class', 'scrubber-label')
      .attr('fill', DATA_AMBER)
      .attr('font-size', '10px')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-weight', '600')
      .attr('text-anchor', 'middle');

    // Click overlay — nearest-path hit-test + scrubber move fallback
    const yRange = yScale.domain();
    const hitThreshold = (yRange[1] - yRange[0]) * 0.03; // 3% of Y range

    g.append('rect')
      .attr('width', w)
      .attr('height', h)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent) => {
        const [mx, my] = d3.pointer(event);
        const clickTime = xScale.invert(mx);
        const clickPrice = yScale.invert(my);
        const step = Math.round(
          (clickTime / result.optionParams.expiry) *
            result.simulationParams.numSteps,
        );
        const clampedStep = Math.max(
          0,
          Math.min(result.simulationParams.numSteps, step),
        );

        // Find the nearest path at this timestep
        let nearestIdx = result.activePathIndex;
        let minDist = Math.abs(
          result.paths[nearestIdx].prices[clampedStep] - clickPrice,
        );
        for (let p = 0; p < result.paths.length; p++) {
          const dist = Math.abs(
            result.paths[p].prices[clampedStep] - clickPrice,
          );
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = p;
          }
        }

        dispatch({ type: 'SET_PLAYING', payload: false });

        // If nearest path is different and close enough, switch to it
        if (nearestIdx !== result.activePathIndex && minDist < hitThreshold) {
          selectPath(nearestIdx);
        } else {
          // Fall back to scrubber move
          dispatch({ type: 'SET_STEP', payload: clampedStep });
        }
      });

    scalesRef.current = { x: xScale, y: yScale };
  }, [result, dims, dispatch]);

  // Scrubber update
  useEffect(() => {
    if (!result || !svgRef.current || !scalesRef.current) return;

    const { x: xScale, y: yScale } = scalesRef.current;
    const t = result.activePath.times[currentStep] ?? 0;
    const S = result.activePath.prices[currentStep] ?? 0;
    const x = xScale(t);
    const y = yScale(S);

    const sel = d3.select(svgRef.current).select('.scrubber');
    sel.select('.scrubber-line').attr('x1', x).attr('x2', x);
    sel.select('.scrubber-dot').attr('cx', x).attr('cy', y);
    sel
      .select('.scrubber-label')
      .attr('x', x)
      .attr('y', -3)
      .text(S.toFixed(2));
  }, [currentStep, result]);

  return (
    <PanelContainer title="Price Path" className="panel-price-path" accent={PANEL_ACCENTS.pricePath}>
      <div ref={containerRef} className="chart-container">
        <svg ref={svgRef} width={dims.width} height={dims.height} />
      </div>
    </PanelContainer>
  );
}
