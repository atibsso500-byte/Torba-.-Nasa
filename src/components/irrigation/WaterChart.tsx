/**
 * TURBA Phase 3 — Interactive Daily Soil-Water Balance SVG Chart
 * Visually distinguishes Observed/Assimilated Historical Days from Future NWP Forecasts:
 * - Solid line & clean background for observed history
 * - Dashed depletion line & cool slate-cyan shading for forecast horizon
 * - Crisp RAW (amber dashed) and TAW (rose dotted) threshold lines
 * - Effective rainfall (sky bars) & Net irrigation (emerald bars)
 * - Interactive hover crosshair reading exact daily water-balance numbers
 */

import React, { useState } from 'react';
import { DailyWaterBalanceStep } from '../../types/irrigation';
import { useTranslation } from '../../i18n/language';

interface WaterBalanceChartProps {
  historicalSteps: DailyWaterBalanceStep[];
  forecastSteps: DailyWaterBalanceStep[];
}

export const WaterBalanceChart: React.FC<WaterBalanceChartProps> = ({
  historicalSteps,
  forecastSteps,
}) => {
  const { t } = useTranslation();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const allSteps = [...historicalSteps, ...forecastSteps];
  if (allSteps.length === 0) {
    return null;
  }

  const width = 680;
  const height = 240;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 22;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxTaw = Math.max(...allSteps.map((s) => s.tawMm), 10);
  const maxWaterInput = Math.max(
    ...allSteps.map((s) => Math.max(s.effectiveRainfallMm, s.irrigationNetMm)),
    0
  );
  const yMax = Math.max(maxTaw * 1.08, maxWaterInput * 1.15, 20);

  const xForIndex = (i: number) => {
    if (allSteps.length === 1) return padLeft + plotW / 2;
    return padLeft + (i / (allSteps.length - 1)) * plotW;
  };
  const yForMm = (mm: number) => {
    const clamped = Math.max(0, Math.min(yMax, mm));
    return padTop + plotH - (clamped / yMax) * plotH;
  };

  const firstForecastIdx = allSteps.findIndex((s) => s.isForecast);
  const boundaryX =
    firstForecastIdx > 0
      ? (xForIndex(firstForecastIdx - 1) + xForIndex(firstForecastIdx)) / 2
      : firstForecastIdx === 0
      ? padLeft
      : null;

  const obsPoints = allSteps
    .map((s, idx) => (!s.isForecast ? `${xForIndex(idx).toFixed(1)},${yForMm(s.depletionEndMm).toFixed(1)}` : null))
    .filter(Boolean) as string[];

  const forecastPoints: string[] = [];
  if (firstForecastIdx > 0) {
    const lastHist = allSteps[firstForecastIdx - 1];
    forecastPoints.push(
      `${xForIndex(firstForecastIdx - 1).toFixed(1)},${yForMm(lastHist.depletionEndMm).toFixed(1)}`
    );
  }
  allSteps.forEach((s, idx) => {
    if (s.isForecast) {
      forecastPoints.push(`${xForIndex(idx).toFixed(1)},${yForMm(s.depletionEndMm).toFixed(1)}`);
    }
  });

  const latestRaw = allSteps[allSteps.length - 1]?.rawMm ?? 0;
  const latestTaw = allSteps[allSteps.length - 1]?.tawMm ?? 0;
  const barW = Math.max(4, Math.min(14, (plotW / allSteps.length) * 0.48));
  const hoveredStep = hoveredIdx !== null ? allSteps[hoveredIdx] : null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-2.5" dir="ltr">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-stone-900">{t.irrigation.chartTitle}</span>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-stone-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-700 inline-block" />
            {t.irrigation.observedLabel} D(t)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-sky-600 inline-block" />
            {t.irrigation.forecastLabel} D(t)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
            RAW ({latestRaw.toFixed(0)} mm)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-sky-500/70 inline-block rounded-xs" />
            Peff
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-emerald-500/80 inline-block rounded-xs" />
            Irrig
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[460px] select-none cursor-crosshair"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Forecast Region Shading */}
          {boundaryX !== null && (
            <rect
              x={boundaryX}
              y={padTop}
              width={padLeft + plotW - boundaryX}
              height={plotH}
              fill="#f0f9ff"
            />
          )}

          {/* Horizontal Y grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
            const val = yMax * frac;
            const y = yForMm(val);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotW}
                  y2={y}
                  stroke="#e7e5e4"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-stone-500 font-mono"
                  fontSize={9}
                >
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Y axis unit label */}
          <text x={8} y={padTop - 8} className="fill-stone-500 font-mono" fontSize={9}>
            mm
          </text>

          {/* TAW limit line */}
          <line
            x1={padLeft}
            y1={yForMm(latestTaw)}
            x2={padLeft + plotW}
            y2={yForMm(latestTaw)}
            stroke="#e11d48"
            strokeWidth={1.2}
            strokeDasharray="2,3"
          />
          <text
            x={padLeft + 4}
            y={Math.max(padTop + 10, yForMm(latestTaw) - 3)}
            className="fill-rose-700 font-mono font-semibold"
            fontSize={9}
          >
            TAW {latestTaw.toFixed(0)} mm
          </text>

          {/* RAW threshold line */}
          <line
            x1={padLeft}
            y1={yForMm(latestRaw)}
            x2={padLeft + plotW}
            y2={yForMm(latestRaw)}
            stroke="#d97706"
            strokeWidth={1.5}
            strokeDasharray="5,3"
          />
          <text
            x={padLeft + 4}
            y={Math.max(padTop + 10, yForMm(latestRaw) - 4)}
            className="fill-amber-700 font-mono font-semibold"
            fontSize={9}
          >
            RAW {latestRaw.toFixed(0)} mm
          </text>

          {/* Effective Rainfall & Irrigation Bars */}
          {allSteps.map((s, idx) => {
            const cx = xForIndex(idx);
            const elements: React.ReactNode[] = [];
            if (s.effectiveRainfallMm > 0) {
              const yTop = yForMm(s.effectiveRainfallMm);
              elements.push(
                <rect
                  key={`rain-${idx}`}
                  x={cx - barW / 2}
                  y={yTop}
                  width={barW}
                  height={Math.max(2, padTop + plotH - yTop)}
                  fill={s.isForecast ? 'rgba(14, 165, 233, 0.35)' : 'rgba(14, 165, 233, 0.72)'}
                  stroke={s.isForecast ? '#0284c7' : 'none'}
                  strokeDasharray={s.isForecast ? '2,2' : undefined}
                  rx={1.5}
                />
              );
            }
            if (s.irrigationNetMm > 0) {
              const yTop = yForMm(s.irrigationNetMm);
              elements.push(
                <rect
                  key={`irr-${idx}`}
                  x={cx - barW / 2 + 2}
                  y={yTop}
                  width={Math.max(3, barW - 2)}
                  height={Math.max(2, padTop + plotH - yTop)}
                  fill="rgba(16, 185, 129, 0.75)"
                  rx={1.5}
                />
              );
            }
            return elements;
          })}

          {/* Observed / Forecast Boundary Line */}
          {boundaryX !== null && (
            <g>
              <line
                x1={boundaryX}
                y1={padTop}
                x2={boundaryX}
                y2={padTop + plotH}
                stroke="#0369a1"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <text
                x={boundaryX + 4}
                y={padTop + 10}
                className="fill-sky-800 font-mono font-semibold"
                fontSize={8.5}
              >
                FORECAST →
              </text>
            </g>
          )}

          {/* Observed Depletion Curve (Solid) */}
          {obsPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#047857"
              strokeWidth={2.2}
              points={obsPoints.join(' ')}
            />
          )}

          {/* Forecast Depletion Curve (Dashed) */}
          {forecastPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#0284c7"
              strokeWidth={2.2}
              strokeDasharray="5,4"
              points={forecastPoints.join(' ')}
            />
          )}

          {/* Interactive Data Points & Hover Targets */}
          {allSteps.map((s, idx) => {
            const cx = xForIndex(idx);
            const cy = yForMm(s.depletionEndMm);
            const isHovered = hoveredIdx === idx;
            return (
              <g key={s.date}>
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={padTop + plotH}
                    stroke="#57534e"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4.5 : s.exceededRaw ? 3.2 : 2.3}
                  fill={
                    s.exceededRaw
                      ? '#d97706'
                      : s.isForecast
                      ? '#0284c7'
                      : '#047857'
                  }
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                {/* Invisible wider hover hit column */}
                <rect
                  x={cx - plotW / Math.max(1, allSteps.length * 2)}
                  y={padTop}
                  width={Math.max(10, plotW / Math.max(1, allSteps.length))}
                  height={plotH + padBottom}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(idx)}
                />
              </g>
            );
          })}

          {/* X-axis sparse date labels */}
          {allSteps.map((s, idx) => {
            const stride = allSteps.length > 14 ? 4 : allSteps.length > 8 ? 3 : 2;
            if (idx !== 0 && idx !== allSteps.length - 1 && idx % stride !== 0) {
              return null;
            }
            return (
              <text
                key={`lbl-${s.date}`}
                x={xForIndex(idx)}
                y={height - 10}
                textAnchor="middle"
                className="fill-stone-500 font-mono"
                fontSize={8.5}
              >
                {s.date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Interactive Crosshair Readout */}
      <div className="min-h-[34px] px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-stone-700">
        {hoveredStep ? (
          <>
            <span className="font-bold text-stone-900">
              {hoveredStep.date} ({hoveredStep.isForecast ? t.irrigation.forecastLabel : t.irrigation.observedLabel})
            </span>
            <span>ET0: {hoveredStep.et0Mm.toFixed(2)} mm</span>
            <span>ETc_adj: {hoveredStep.etcAdjustedMm.toFixed(2)} mm</span>
            <span>Peff: {hoveredStep.effectiveRainfallMm.toFixed(1)} mm</span>
            {hoveredStep.irrigationNetMm > 0 && (
              <span className="text-emerald-700 font-bold">In: +{hoveredStep.irrigationNetMm.toFixed(1)} mm</span>
            )}
            <span className={hoveredStep.exceededRaw ? 'text-amber-700 font-bold' : 'text-stone-900 font-bold'}>
              D: {hoveredStep.depletionEndMm.toFixed(1)} / RAW {hoveredStep.rawMm.toFixed(1)} mm
            </span>
          </>
        ) : (
          <span className="text-stone-500">
            Hover over chart points to inspect daily ET0, ETc_adj, effective rainfall, and root-zone depletion D(t).
          </span>
        )}
      </div>
    </div>
  );
};
