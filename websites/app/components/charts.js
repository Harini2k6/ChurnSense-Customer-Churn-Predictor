"use client";

// Lightweight SVG charts (no chart library needed). All numbers come from the API.

import { fmtInt, fmtPct, riskFromProbability, riskStyle } from "./ui";

/** Donut: share of HIGH / MEDIUM / LOW customers. */
export function RiskDonut({ stats }) {
  const total = stats.total_customers || 0;
  const values = [
    { name: "HIGH", value: stats.high_risk || 0 },
    { name: "MEDIUM", value: stats.medium_risk || 0 },
    { name: "LOW", value: stats.low_risk || 0 },
  ];

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
      <div className="relative h-48 w-48 shrink-0">
        <svg
          viewBox="0 0 180 180"
          className="h-48 w-48 -rotate-90"
          role="img"
          aria-label={`Risk distribution: ${values.map((v) => `${v.value} ${v.name.toLowerCase()}`).join(", ")}`}
        >
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#eef0f7" strokeWidth="22" />
          {values.map((item) => {
            const length = total ? (item.value / total) * circumference : 0;
            const element = (
              <circle
                key={item.name}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={riskStyle[item.name].color}
                strokeWidth="22"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return element;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900">{fmtInt(total)}</span>
          <span className="text-xs text-slate-500">Customers</span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-4">
        {values.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: riskStyle[item.name].color }}
              />
              {riskStyle[item.name].label} Risk
            </span>
            <span className="text-slate-500">
              {fmtInt(item.value)} ({total ? ((item.value / total) * 100).toFixed(1) : "0.0"}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bar chart: how many customers fall in each 10% probability bucket. */
export function ProbabilityHistogram({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const width = 520;
  const height = 220;
  const pad = { top: 16, right: 8, bottom: 34, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const slot = innerW / buckets.length;
  const barW = slot * 0.72;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Number of customers in each churn-probability range"
    >
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={pad.top + innerH}
        y2={pad.top + innerH}
        stroke="#e2e8f0"
      />
      {buckets.map((bucket, i) => {
        const h = (bucket.count / max) * innerH;
        const x = pad.left + i * slot + (slot - barW) / 2;
        const y = pad.top + innerH - h;
        // colour by the lower edge of the bucket (0-10 => low ... 70-100 => high)
        const risk = riskFromProbability(i * 10);
        return (
          <g key={bucket.range}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, bucket.count ? 2 : 0)}
              rx="4"
              fill={riskStyle[risk].color}
            >
              <title>{`${bucket.range}: ${fmtInt(bucket.count)} customers`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={Math.max(y - 5, 11)}
              textAnchor="middle"
              fontSize="10"
              fill="#475569"
            >
              {fmtInt(bucket.count)}
            </text>
            <text
              x={x + barW / 2}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {bucket.range.replace("%", "")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal stacked bars: risk mix inside each subscription plan. */
export function PlanRiskBars({ plans }) {
  return (
    <div className="space-y-5">
      {plans.map((plan) => {
        const total = plan.total || 1;
        const segments = [
          { key: "HIGH", value: plan.high },
          { key: "MEDIUM", value: plan.medium },
          { key: "LOW", value: plan.low },
        ];
        return (
          <div key={plan.plan}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-800">{plan.plan}</span>
              <span className="text-slate-500">
                {fmtInt(plan.total)} customers · avg {fmtPct(plan.average_probability)}
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              {segments.map((s) => (
                <div
                  key={s.key}
                  title={`${riskStyle[s.key].label}: ${fmtInt(s.value)}`}
                  style={{
                    width: `${(s.value / total) * 100}%`,
                    backgroundColor: riskStyle[s.key].color,
                  }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex gap-4 text-xs text-slate-500">
              {segments.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: riskStyle[s.key].color }}
                  />
                  {riskStyle[s.key].label} {fmtInt(s.value)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Half-circle gauge for a single churn probability. */
export function ProbabilityGauge({ value, risk }) {
  const radius = 80;
  const arc = Math.PI * radius; // half circumference
  const pct = Math.min(100, Math.max(0, value));
  const color = riskStyle[risk]?.color || "#64748b";

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg
        viewBox="0 0 200 118"
        className="w-full"
        role="img"
        aria-label={`Churn probability ${pct.toFixed(1)} percent, ${risk} risk`}
      >
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#eef0f7"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * arc} ${arc}`}
        />
        {/* 30% and 70% threshold ticks */}
        {[30, 70].map((t) => {
          const angle = Math.PI - (t / 100) * Math.PI;
          const x1 = 100 + Math.cos(angle) * 66;
          const y1 = 100 - Math.sin(angle) * 66;
          const x2 = 100 + Math.cos(angle) * 94;
          const y2 = 100 - Math.sin(angle) * 94;
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="1.5" />;
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
        <span className="text-4xl font-bold tracking-tight text-slate-900">{fmtPct(pct)}</span>
        <span className="text-xs text-slate-500">chance of churning in 30 days</span>
      </div>
    </div>
  );
}
