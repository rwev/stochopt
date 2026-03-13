import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSimulationContext } from '../../context/SimulationContext';
import { useDimensions } from '../../hooks/useDimensions';
import { PanelContainer } from '../layout/PanelContainer';
import { logNormalPDF } from '../../utils/math';
import {
  CHART_AXIS,
  DATA_BLUE,
  DATA_RED,
  DATA_AMBER,
  TEXT_MUTED,
  PANEL_ACCENTS,
} from '../../theme';

const MARGIN = { top: 12, right: 20, bottom: 30, left: 50 };

export function DistributionPanel() {
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

    const T = result.optionParams.expiry;
    const t = result.activePath.times[currentStep] ?? 0;
    const St = result.activePath.prices[currentStep] ?? result.modelParams.s0;
    const remaining = T - t;
    const sigma = result.modelParams.sigma;
    const mu = result.modelParams.mu;
    const K = result.optionParams.strike;
    const numSteps = result.simulationParams.numSteps;

    // Terminal prices from MC fan
    const terminalPrices: number[] = [];
    for (const path of result.paths) {
      terminalPrices.push(path.prices[numSteps]);
    }

    // Conditional distribution: ln S(T) ~ N(logMu, logSigma^2)
    const logMu = Math.log(St) + (mu - 0.5 * sigma * sigma) * remaining;
    const logSigma = remaining > 0.001 ? sigma * Math.sqrt(remaining) : 0.001;

    const pMin = Math.max(
      d3.min(terminalPrices) ?? St * 0.5,
      St * Math.exp(logMu - Math.log(St) - 3 * logSigma),
    );
    const pMax = Math.min(
      d3.max(terminalPrices) ?? St * 2,
      St * Math.exp(logMu - Math.log(St) + 3 * logSigma),
    );
    const xScale = d3
      .scaleLinear()
      .domain([pMin * 0.9, pMax * 1.1])
      .range([0, w]);

    // Density curve
    const nPoints = 200;
    const [xMin, xMax] = xScale.domain();
    const dx = (xMax - xMin) / nPoints;
    const densityData: [number, number][] = [];
    for (let i = 0; i <= nPoints; i++) {
      const x = xMin + i * dx;
      const y = logNormalPDF(x, logMu, logSigma);
      densityData.push([x, y]);
    }

    const densityMax = d3.max(densityData, (d) => d[1]) ?? 1;

    // Histogram
    const histogram = d3
      .bin()
      .domain(xScale.domain() as [number, number])
      .thresholds(30);
    const bins = histogram(terminalPrices);
    const binMax =
      d3.max(bins, (b) => b.length / (terminalPrices.length * (b.x1! - b.x0!))) ?? 1;

    const yMax = Math.max(densityMax, binMax) * 1.1;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([h, 0]);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.0f')))
      .attr('color', CHART_AXIS);
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4))
      .attr('color', CHART_AXIS);

    // Histogram bars
    g.selectAll('.hist-bar')
      .data(bins)
      .join('rect')
      .attr('class', 'hist-bar')
      .attr('x', (d) => xScale(d.x0!))
      .attr('y', (d) =>
        yScale(d.length / (terminalPrices.length * (d.x1! - d.x0!))),
      )
      .attr('width', (d) =>
        Math.max(0, xScale(d.x1!) - xScale(d.x0!) - 1),
      )
      .attr('height', (d) =>
        h - yScale(d.length / (terminalPrices.length * (d.x1! - d.x0!))),
      )
      .attr('fill', DATA_BLUE)
      .attr('opacity', 0.18);

    // Density curve
    const line = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(densityData)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', DATA_BLUE)
      .attr('stroke-width', 1.5);

    // Strike marker
    if (K >= xMin && K <= xMax) {
      g.append('line')
        .attr('x1', xScale(K))
        .attr('x2', xScale(K))
        .attr('y1', 0)
        .attr('y2', h)
        .attr('stroke', DATA_RED)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,4')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', xScale(K) + 4)
        .attr('y', 10)
        .attr('fill', DATA_RED)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('opacity', 0.8)
        .text('K');
    }

    // Active path terminal marker
    const activeTerminal = result.activePath.prices[numSteps];
    if (activeTerminal >= xMin && activeTerminal <= xMax) {
      g.append('line')
        .attr('x1', xScale(activeTerminal))
        .attr('x2', xScale(activeTerminal))
        .attr('y1', 0)
        .attr('y2', h)
        .attr('stroke', DATA_AMBER)
        .attr('stroke-width', 1.5);

      g.append('text')
        .attr('x', xScale(activeTerminal) + 4)
        .attr('y', 24)
        .attr('fill', DATA_AMBER)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', '600')
        .text(`S(T)=${activeTerminal.toFixed(1)}`);
    }

    // Caption
    g.append('text')
      .attr('x', w / 2)
      .attr('y', h + 24)
      .attr('fill', TEXT_MUTED)
      .attr('font-size', '10px')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('text-anchor', 'middle')
      .text(
        remaining > 0.01
          ? `S(T) | S(${t.toFixed(2)}) = ${St.toFixed(1)}`
          : 'Terminal distribution',
      );
  }, [result, dims, currentStep]);

  return (
    <PanelContainer title="Distribution" className="panel-distribution" accent={PANEL_ACCENTS.distribution}>
      <div ref={containerRef} className="chart-container">
        <svg ref={svgRef} width={dims.width} height={dims.height} />
      </div>
    </PanelContainer>
  );
}
