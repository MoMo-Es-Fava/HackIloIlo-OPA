"use client";

export interface LineChartPoint {
  key: string;
  label: string;
}

export interface LineChartSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  dash?: string;
}

interface LineChartProps {
  title: string;
  description: string;
  points: LineChartPoint[];
  series: LineChartSeries[];
  formatValue?: (value: number) => string;
}

const WIDTH = 900;
const HEIGHT = 300;
const LEFT = 82;
const RIGHT = 20;
const TOP = 18;
const BOTTOM = 38;

export function LineChart({
  title,
  description,
  points,
  series,
  formatValue = (value) => String(value),
}: LineChartProps) {
  const values = series.flatMap((line) => line.values.filter((value): value is number =>
    value !== null && Number.isFinite(value),
  ));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const spread = max - min || 1;
  const padding = spread * 0.08;
  const low = min < 0 ? min - padding : 0;
  const high = max > 0 ? max + padding : min < 0 ? 0 : 1;
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) => LEFT + (points.length < 2 ? plotWidth / 2 : index * plotWidth / (points.length - 1));
  const y = (value: number) => TOP + (high - value) / (high - low) * plotHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => high - ((high - low) * index) / 4);
  const labelStep = Math.max(1, Math.ceil(points.length / 7));
  const hasValues = values.length > 0;

  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          <p className="text-sm text-sub">{description}</p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label={`${title} legend`}>
          {series.map((line) => (
            <li key={line.key} className="flex items-center gap-2 text-sm text-ink">
              <span
                aria-hidden="true"
                className="w-6 border-t-[3px]"
                style={{ borderColor: line.color, borderStyle: line.dash ? "dashed" : "solid" }}
              />
              {line.label}
            </li>
          ))}
        </ul>
      </div>
      {!points.length || !hasValues ? (
        <p className="rounded-xl bg-mist px-4 py-8 text-center text-sm text-sub">
          There is not enough recorded data to draw this trend yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <svg
              aria-hidden="true"
              className="h-auto min-w-[640px] w-full"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="none"
            >
              {ticks.map((tick, index) => (
                <g key={index}>
                  <line
                    x1={LEFT}
                    x2={WIDTH - RIGHT}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke="currentColor"
                    className="text-line"
                    strokeDasharray={index === 4 ? undefined : "3 5"}
                  />
                  <text x={LEFT - 10} y={y(tick) + 4} textAnchor="end" fill="var(--color-sub)" className="text-[11px]">
                    {formatValue(tick)}
                  </text>
                </g>
              ))}
              {points.map((point, index) => index % labelStep === 0 || index === points.length - 1 ? (
                <text
                  key={point.key}
                  x={x(index)}
                  y={HEIGHT - 10}
                  textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                  fill="var(--color-sub)"
                  className="text-[11px]"
                >
                  {point.label}
                </text>
              ) : null)}
              {series.map((line) => {
                const segments: string[] = [];
                let segment = "";
                line.values.forEach((value, index) => {
                  if (value === null || !Number.isFinite(value)) {
                    if (segment) segments.push(segment);
                    segment = "";
                    return;
                  }
                  segment += `${segment ? " " : "M"} ${x(index)} ${y(value)}`;
                });
                if (segment) segments.push(segment);
                return (
                  <g key={line.key}>
                    {segments.map((path, index) => (
                      <path
                        key={`${line.key}-${index}`}
                        d={path}
                        fill="none"
                        stroke={line.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={line.dash}
                      />
                    ))}
                    {line.values.map((value, index) => value === null || !Number.isFinite(value) ? null : (
                      <g key={`${line.key}-${points[index]?.key ?? index}`}>
                        <circle cx={x(index)} cy={y(value)} r="8" fill="transparent">
                          <title>{`${line.label}, ${points[index]?.label}: ${formatValue(value)}`}</title>
                        </circle>
                        <circle cx={x(index)} cy={y(value)} r="3.5" fill="white" stroke={line.color} strokeWidth="2" />
                      </g>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
          <details className="group rounded-xl border border-line/80 bg-white">
            <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-bold text-paddy-d focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paddy">
              View chart data table
            </summary>
            <div className="overflow-x-auto border-t border-line/80">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">{title} — {description}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Date</th>
                    {series.map((line) => <th key={line.key} scope="col" className="px-4 py-3 font-bold">{line.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {points.map((point, pointIndex) => (
                    <tr key={point.key} className="border-t border-line/60">
                      <th scope="row" className="whitespace-nowrap px-4 py-2 font-medium">{point.label}</th>
                      {series.map((line) => {
                        const value = line.values[pointIndex];
                        return <td key={line.key} className="tnum whitespace-nowrap px-4 py-2">{value === null || value === undefined ? "—" : formatValue(value)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
