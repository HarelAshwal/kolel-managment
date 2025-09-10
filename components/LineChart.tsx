import React from 'react';
import type { TimelineDataPoint } from '../types';

interface LineChartProps {
  data: TimelineDataPoint[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const width = 800;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  if (data.length < 2) return null;

  const yMax = Math.max(...data.map(d => d.averageHours), 0) * 1.1 || 10; // Add 10% padding, handle all-zero case
  const yMin = 0;

  const getX = (index: number) => (index / (data.length - 1)) * innerWidth;
  const getY = (value: number) => innerHeight - ((value - yMin) / (yMax - yMin)) * innerHeight;
  
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.averageHours)}`)
    .join(' ');

  const xTicks = data.map((d, i) => ({
    value: d.monthYear,
    xOffset: getX(i),
  }));

  const yTicks = Array.from({ length: 5 }, (_, i) => {
      const value = yMin + (i / 4) * (yMax - yMin);
      return {
          value: Math.round(value),
          yOffset: getY(value)
      }
  });

  return (
    <div className="w-full h-auto" dir="ltr">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                {/* Axes */}
                <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="currentColor" className="text-slate-300 dark:text-slate-600" />
                <line x1={0} y1={0} x2={0} y2={innerHeight} stroke="currentColor" className="text-slate-300 dark:text-slate-600" />

                {/* Y-axis Ticks and Grid Lines */}
                {yTicks.map(({ value, yOffset }) => (
                    <g key={`y-tick-${value}`} transform={`translate(0, ${yOffset})`}>
                        <line x1={0} x2={innerWidth} stroke="currentColor" strokeDasharray="2,2" className="text-slate-200 dark:text-slate-700" />
                        <text x={-10} y={5} textAnchor="end" className="text-xs fill-current text-slate-500 dark:text-slate-400">
                            {value}
                        </text>
                    </g>
                ))}

                {/* X-axis Ticks */}
                {xTicks.map(({ value, xOffset }) => (
                    <g key={`x-tick-${value}`} transform={`translate(${xOffset}, ${innerHeight})`}>
                        <text x={0} y={20} textAnchor="middle" className="text-xs fill-current text-slate-500 dark:text-slate-400" transform={`rotate(-30, ${0}, 25)`}>
                            {value}
                        </text>
                    </g>
                ))}
                 <text x={innerWidth / 2} y={innerHeight + 55} textAnchor="middle" className="text-sm fill-current text-slate-600 dark:text-slate-300">
                    חודש
                </text>
                <text transform={`translate(-35, ${innerHeight/2}) rotate(-90)`} textAnchor="middle" className="text-sm fill-current text-slate-600 dark:text-slate-300">
                    ממוצע שעות
                </text>


                {/* Line */}
                <path d={linePath} fill="none" strokeWidth={2} className="stroke-current text-indigo-500" />

                {/* Points */}
                {data.map((d, i) => (
                    <circle key={i} cx={getX(i)} cy={getY(d.averageHours)} r={4} className="fill-current text-indigo-500 stroke-current text-white dark:text-slate-800" strokeWidth={2}>
                        <title>{`${d.monthYear}: ${d.averageHours.toFixed(2)} שעות`}</title>
                    </circle>
                ))}
            </g>
        </svg>
    </div>
  );
};

export default LineChart;
