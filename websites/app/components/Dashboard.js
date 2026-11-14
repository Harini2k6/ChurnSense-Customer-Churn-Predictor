"use client";

import { buildQuery } from "../lib/api";
import { useApi } from "../lib/useApi";
import { PlanRiskBars, ProbabilityHistogram, RiskDonut } from "./charts";
import {
  Card,
  CustomerTable,
  ErrorBox,
  LoadingNote,
  PageHeading,
  SectionTitle,
  Skeleton,
  fmtInt,
  fmtMoney,
  fmtPct,
} from "./ui";

export default function Dashboard({ onOpenCustomer, onNavigate }) {
  const stats = useApi("/api/stats", { cache: true });
  const top = useApi(
    `/api/customers${buildQuery({ sort: "probability_desc", limit: 10 })}`
  );

  const s = stats.data;
  const total = s?.total_customers || 0;
  const share = (n) => (total ? `${((n / total) * 100).toFixed(1)}% of customers` : "");

  const cards = s
    ? [
        {
          label: "Total Customers",
          value: fmtInt(s.total_customers),
          hint: "All customer accounts in the dataset",
          accent: "from-blue-500 to-violet-500",
        },
        {
          label: "High Risk",
          value: fmtInt(s.high_risk),
          hint: `Probability ≥ 70% · ${share(s.high_risk)}`,
          accent: "from-rose-500 to-rose-400",
        },
        {
          label: "Medium Risk",
          value: fmtInt(s.medium_risk),
          hint: `30% – 70% · ${share(s.medium_risk)}`,
          accent: "from-amber-500 to-amber-400",
        },
        {
          label: "Low Risk",
          value: fmtInt(s.low_risk),
          hint: `Below 30% · ${share(s.low_risk)}`,
          accent: "from-emerald-500 to-emerald-400",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Dashboard"
        subtitle="Overview of churn risk across your B2B accounts, scored by your trained model."
      />

      <LoadingNote retrying={stats.retrying} />
      {stats.error && <ErrorBox message={stats.error} onRetry={stats.reload} />}

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.loading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[116px]" />)
          : cards.map((card) => (
              <div
                key={card.label}
                className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} />
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
              </div>
            ))}
      </section>

      {/* Overall overview strip */}
      {s && (
        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="!p-5">
            <p className="text-sm font-medium text-slate-500">Average churn probability</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {fmtPct(s.average_churn_probability)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Mean across all customers</p>
          </Card>
          <Card className="!p-5">
            <p className="text-sm font-medium text-slate-500">Total monthly recurring revenue</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{fmtMoney(s.total_mrr_usd)}</p>
            <p className="mt-1 text-xs text-slate-400">Sum of MRR for all accounts</p>
          </Card>
          <Card className="!p-5">
            <p className="text-sm font-medium text-slate-500">MRR in high-risk accounts</p>
            <p className="mt-2 text-2xl font-bold text-rose-600">{fmtMoney(s.high_risk_mrr_usd)}</p>
            <p className="mt-1 text-xs text-slate-400">
              {s.total_mrr_usd ? ((s.high_risk_mrr_usd / s.total_mrr_usd) * 100).toFixed(1) : "0.0"}%
              of total MRR
            </p>
          </Card>
        </section>
      )}

      {/* Charts */}
      {s && (
        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <SectionTitle
              title="Churn Risk Distribution"
              subtitle="Actual split across your customer dataset"
            />
            <RiskDonut stats={s} />
          </Card>

          <Card>
            <SectionTitle
              title="Churn Probability Spread"
              subtitle="Number of customers in each 10% probability range"
            />
            <ProbabilityHistogram buckets={s.probability_histogram} />
          </Card>

          <Card className="xl:col-span-2">
            <SectionTitle
              title="Risk by Subscription Plan"
              subtitle="How high, medium and low risk customers are spread across plans"
            />
            <PlanRiskBars plans={s.by_plan} />
          </Card>
        </section>
      )}

      {/* Customer table */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Highest-Risk Customers</h2>
            <p className="text-sm text-slate-500">
              {top.loading
                ? "Loading data..."
                : `Top ${top.data?.customers?.length ?? 0} accounts by churn probability`}
            </p>
          </div>
          <button
            onClick={() => onNavigate("Customers")}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            View all customers
          </button>
        </div>

        {top.error ? (
          <div className="px-6 pb-6">
            <ErrorBox message={top.error} onRetry={top.reload} />
          </div>
        ) : top.loading ? (
          <div className="space-y-2 px-6 pb-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <CustomerTable customers={top.data.customers} onOpen={onOpenCustomer} />
        )}
      </section>
    </div>
  );
}
