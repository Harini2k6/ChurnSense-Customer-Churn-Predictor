"use client";

import { useEffect, useState } from "react";
import { buildQuery } from "../lib/api";
import { useApi } from "../lib/useApi";
import PredictionPanel from "./PredictionPanel";
import { CustomerTable, ErrorBox, LoadingNote, PageHeading, fmtInt } from "./ui";

const PAGE_SIZE = 25;

const SORTS = [
  { value: "id", label: "Account ID" },
  { value: "probability_desc", label: "Churn probability (high → low)" },
  { value: "probability_asc", label: "Churn probability (low → high)" },
  { value: "mrr_desc", label: "Revenue (high → low)" },
];

const selectClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export default function Customers({ selectedId, onSelect, onClear }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [plan, setPlan] = useState("");
  const [risk, setRisk] = useState("");
  const [sort, setSort] = useState("id");
  const [page, setPage] = useState(0);

  const stats = useApi("/api/stats", { cache: true });

  // Wait 300 ms after typing stops before asking the backend.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Go back to page 1 whenever a filter changes.
  useEffect(() => setPage(0), [debounced, plan, risk, sort]);

  const list = useApi(
    selectedId
      ? null
      : `/api/customers${buildQuery({
          q: debounced,
          plan,
          risk,
          sort,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })}`
  );

  if (selectedId) {
    return <PredictionPanel accountId={selectedId} onBack={onClear} />;
  }

  const total = list.data?.total ?? 0;
  const from = total ? page * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const filtersActive = search || plan || risk || sort !== "id";

  return (
    <div className="space-y-6">
      <PageHeading
        title="Customers"
        subtitle="Search by Account ID, filter by plan or risk level, and open any customer for details."
      />

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Account ID (e.g. ACC_00041)"
            aria-label="Search by Account ID"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
          <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Filter by plan" className={selectClass}>
            <option value="">All plans</option>
            {(stats.data?.plans || []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Filter by risk level" className={selectClass}>
            <option value="">All risk levels</option>
            <option value="HIGH">High risk</option>
            <option value="MEDIUM">Medium risk</option>
            <option value="LOW">Low risk</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort customers" className={selectClass}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </div>
        {filtersActive && (
          <button
            onClick={() => {
              setSearch("");
              setPlan("");
              setRisk("");
              setSort("id");
            }}
            className="mt-3 text-xs font-semibold text-violet-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </section>

      <LoadingNote retrying={list.retrying} />
      {list.error && <ErrorBox message={list.error} onRetry={list.reload} />}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Customer records</h2>
            <p className="text-sm text-slate-500" aria-live="polite">
              {list.loading && !list.data
                ? "Loading data..."
                : `Showing ${fmtInt(from)}–${fmtInt(to)} of ${fmtInt(total)} ${total === 1 ? "customer" : "customers"}`}
            </p>
          </div>
          {list.loading && list.data && <span className="text-xs text-slate-400">Updating…</span>}
        </div>

        <CustomerTable
          customers={list.data?.customers || []}
          loading={list.loading}
          onOpen={onSelect}
        />

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || list.loading}
            className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-slate-500">
            Page {fmtInt(page + 1)} of {fmtInt(lastPage + 1)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage || list.loading}
            className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </section>
    </div>
  );
}
