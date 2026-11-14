"use client";

// Small shared building blocks used by every page.

export const riskStyle = {
  HIGH: {
    label: "High",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    bar: "bg-rose-500",
    color: "#f43f5e",
    soft: "bg-rose-50 text-rose-700",
  },
  MEDIUM: {
    label: "Medium",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    bar: "bg-amber-500",
    color: "#f59e0b",
    soft: "bg-amber-50 text-amber-700",
  },
  LOW: {
    label: "Low",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bar: "bg-emerald-500",
    color: "#10b981",
    soft: "bg-emerald-50 text-emerald-700",
  },
};

export function riskFromProbability(p) {
  if (p < 30) return "LOW";
  if (p < 70) return "MEDIUM";
  return "HIGH";
}

export const fmtInt = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-US"));
export const fmtMoney = (n) =>
  n === null || n === undefined
    ? "—"
    : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
export const fmtPct = (n, digits = 1) =>
  n === null || n === undefined ? "—" : `${Number(n).toFixed(digits)}%`;

export function RiskBadge({ risk }) {
  const style = riskStyle[risk] || riskStyle.LOW;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style.badge}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />
      {risk}
    </span>
  );
}

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export function LoadingNote({ retrying }) {
  if (!retrying) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
    >
      The prediction server is waking up (free hosting sleeps when idle). This can take up to a
      minute — retrying automatically… (attempt {retrying})
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function PageHeading({ title, subtitle }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export function Icon({ type, className = "h-5 w-5" }) {
  const paths = {
    Dashboard: "M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z",
    Customers:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    Predictions: "M3 3v18h18 M7 14l4-4 4 4 5-6",
    "About Project": "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[type] || paths.Dashboard} />
    </svg>
  );
}

/** Probability bar used in tables. */
export function ProbabilityBar({ value, risk }) {
  const style = riskStyle[risk] || riskStyle.LOW;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${style.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-14 text-sm font-medium tabular-nums">{fmtPct(value)}</span>
    </div>
  );
}

/** Table of customers (shared by Dashboard and Customers). */
export function CustomerTable({ customers, onOpen, loading, emptyText = "No matching customers found." }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-6 py-3">Account ID</th>
            <th className="px-6 py-3">Plan</th>
            <th className="px-6 py-3 text-right">MRR</th>
            <th className="px-6 py-3">Churn Probability</th>
            <th className="px-6 py-3">Risk Level</th>
            <th className="px-6 py-3">Details</th>
          </tr>
        </thead>
        <tbody className={`divide-y divide-slate-100 ${loading ? "opacity-50" : ""}`}>
          {customers.map((customer) => (
            <tr key={customer.account_id} className="hover:bg-slate-50">
              <td className="px-6 py-3 font-semibold">{customer.account_id}</td>
              <td className="px-6 py-3 text-slate-600">{customer.subscription_plan}</td>
              <td className="px-6 py-3 text-right tabular-nums text-slate-600">
                {fmtMoney(customer.mrr_usd)}
              </td>
              <td className="px-6 py-3">
                <ProbabilityBar value={customer.churn_probability} risk={customer.risk} />
              </td>
              <td className="px-6 py-3">
                <RiskBadge risk={customer.risk} />
              </td>
              <td className="px-6 py-3">
                <button
                  onClick={() => onOpen(customer.account_id)}
                  className="font-semibold text-violet-700 hover:underline"
                >
                  View details →
                </button>
              </td>
            </tr>
          ))}
          {!loading && customers.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
