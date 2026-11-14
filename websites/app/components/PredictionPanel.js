"use client";

import { useApi } from "../lib/useApi";
import { ProbabilityGauge } from "./charts";
import { Card, ErrorBox, LoadingNote, RiskBadge, SectionTitle, Skeleton, fmtInt, fmtMoney, riskStyle } from "./ui";

const PROFILE_ROWS = [
  { key: "mrr_usd", label: "Monthly revenue (MRR)", format: fmtMoney, hint: "dollars per month" },
  { key: "tenure_months", label: "Tenure", format: (v) => `${fmtInt(v)} months`, hint: "time as a customer" },
  { key: "active_features", label: "Active features", format: fmtInt, hint: "features in use" },
  { key: "support_tickets_30d", label: "Support tickets (30 days)", format: fmtInt, hint: "tickets raised" },
  { key: "days_since_last_login", label: "Days since last login", format: fmtInt, hint: "inactivity" },
  { key: "nps_score", label: "NPS score", format: (v) => (v === null ? "Not recorded" : fmtInt(v)), hint: "satisfaction (0–10)" },
  { key: "estimated_ltv_usd", label: "Estimated LTV", format: fmtMoney, hint: "lifetime value" },
];

function Comparison({ profile, averages }) {
  return (
    <Card>
      <SectionTitle
        title="How this customer compares"
        subtitle="Customer value against the average across all customers"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-4">Metric</th>
              <th className="pb-2 pr-4 text-right">This customer</th>
              <th className="pb-2 text-right">Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PROFILE_ROWS.map((row) => {
              const avg = averages?.[row.key];
              return (
                <tr key={row.key}>
                  <td className="py-2.5 pr-4 text-slate-600">{row.label}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                    {row.format(profile[row.key])}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500">
                    {avg === null || avg === undefined
                      ? "—"
                      : row.key.includes("usd")
                      ? fmtMoney(avg)
                      : Number(avg).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * Full prediction view for one customer: probability, risk level,
 * contributing factors and recommended actions.
 */
export default function PredictionPanel({ accountId, onBack }) {
  const customer = useApi(accountId ? `/api/customers/${encodeURIComponent(accountId)}` : null);
  const stats = useApi("/api/stats", { cache: true });

  if (customer.loading) {
    return (
      <div className="space-y-5">
        <LoadingNote retrying={customer.retrying} />
        <Skeleton className="h-64" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (customer.error) {
    return (
      <div className="space-y-4">
        {onBack && (
          <button onClick={onBack} className="text-sm font-semibold text-violet-700 hover:underline">
            ← Back to customers
          </button>
        )}
        <ErrorBox message={customer.error} onRetry={customer.reload} />
      </div>
    );
  }

  const c = customer.data;
  if (!c) return null;
  const style = riskStyle[c.risk];

  return (
    <div className="space-y-5">
      {onBack && (
        <button onClick={onBack} className="text-sm font-semibold text-violet-700 hover:underline">
          ← Back to customers
        </button>
      )}

      {/* Headline result */}
      <Card>
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="md:w-72">
            <ProbabilityGauge value={c.churn_probability} risk={c.risk} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Customer account</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{c.account_id}</h2>
            <p className="mt-1 text-slate-500">{c.subscription_plan} plan</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <RiskBadge risk={c.risk} />
              <span className="text-sm text-slate-600">
                Churn probability <strong className="text-slate-900">{c.churn_probability}%</strong>
              </span>
            </div>

            <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${style.soft}`}>
              {c.risk === "HIGH" &&
                "This account is very likely to churn in the next 30 days. Immediate customer-success attention is recommended."}
              {c.risk === "MEDIUM" &&
                "This account shows a moderate chance of churning. Increase engagement and monitor activity."}
              {c.risk === "LOW" &&
                "This account is unlikely to churn in the next 30 days. Continue regular engagement."}
            </p>
          </div>
        </div>
      </Card>

      {/* Factors and recommendations */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Factors contributing to risk" subtitle="Warning signals found in this account's data" />
          <ul className="space-y-3">
            {c.risk_factors.map((factor, index) => (
              <li key={index} className="flex gap-3 text-sm text-slate-700">
                <span className="mt-0.5 text-rose-500" aria-hidden="true">●</span>
                {factor}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle title="Recommended actions" subtitle="Suggested retention steps for the success team" />
          <ul className="space-y-3">
            {c.recommendations.map((recommendation, index) => (
              <li key={index} className="flex gap-3 text-sm text-slate-700">
                <span className="mt-0.5 text-emerald-500" aria-hidden="true">✓</span>
                {recommendation}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Comparison profile={c.profile} averages={stats.data?.averages} />
    </div>
  );
}
