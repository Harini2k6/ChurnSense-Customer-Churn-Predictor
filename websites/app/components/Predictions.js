"use client";

import { useEffect, useState } from "react";
import { apiGet, buildQuery } from "../lib/api";
import { useApi } from "../lib/useApi";
import PredictionPanel from "./PredictionPanel";
import { Card, PageHeading, RiskBadge, fmtPct } from "./ui";

const EXAMPLES = [
  { risk: "HIGH", title: "Example: high risk" },
  { risk: "MEDIUM", title: "Example: medium risk" },
  { risk: "LOW", title: "Example: low risk" },
];

function ExampleButton({ risk, title, onPick }) {
  const result = useApi(
    `/api/customers${buildQuery({ risk, sort: "probability_desc", limit: 1 })}`
  );
  const customer = result.data?.customers?.[0];

  return (
    <button
      disabled={!customer}
      onClick={() => customer && onPick(customer.account_id)}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm transition hover:border-violet-300 hover:bg-violet-50/40 disabled:opacity-50"
    >
      <span>
        <span className="block text-xs text-slate-500">{title}</span>
        <span className="font-semibold text-slate-900">{customer ? customer.account_id : "…"}</span>
      </span>
      {customer && <RiskBadge risk={customer.risk} />}
    </button>
  );
}

export default function Predictions({ selectedId, onSelect }) {
  const [input, setInput] = useState(selectedId || "");
  const [debounced, setDebounced] = useState("");
  const [notice, setNotice] = useState("");

  // Keep the box in sync when a customer is opened from elsewhere.
  useEffect(() => {
    if (selectedId) setInput(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const showSuggestions = debounced.length > 0 && debounced !== selectedId;
  const suggestions = useApi(
    showSuggestions ? `/api/customers${buildQuery({ q: debounced, limit: 6 })}` : null
  );

  async function submit(event) {
    event.preventDefault();
    const typed = input.trim();
    if (!typed) return;

    // Look the ID up right now (do not wait for the suggestion list).
    try {
      const result = await apiGet(`/api/customers${buildQuery({ q: typed, limit: 6 })}`);
      const exact = result.customers.find(
        (c) => c.account_id.toLowerCase() === typed.toLowerCase()
      );

      if (exact) {
        setNotice("");
        onSelect(exact.account_id);
      } else if (result.total === 1) {
        setNotice("");
        onSelect(result.customers[0].account_id);
      } else if (result.total === 0) {
        setNotice(`No customer found for "${typed}".`);
      } else {
        setNotice("Several accounts match. Choose one from the list below.");
      }
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Predictions"
        subtitle="Look up a customer to see their churn probability, the factors behind it and what to do next."
      />

      <Card>
        <form onSubmit={submit} className="relative">
          <label htmlFor="account-lookup" className="text-sm font-semibold text-slate-800">
            Account ID
          </label>
          <div className="mt-2 flex gap-3">
            <input
              id="account-lookup"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setNotice("");
              }}
              autoComplete="off"
              placeholder="Type an Account ID, e.g. ACC_00041"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-90"
            >
              Predict
            </button>
          </div>

          {notice && <p className="mt-3 text-sm text-amber-700">{notice}</p>}

          {showSuggestions && suggestions.data && suggestions.data.customers.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {suggestions.data.customers.map((c) => (
                <li key={c.account_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice("");
                      onSelect(c.account_id);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-semibold">{c.account_id}</span>
                    <span className="text-slate-500">{c.subscription_plan}</span>
                    <span className="tabular-nums text-slate-500">{fmtPct(c.churn_probability)}</span>
                    <RiskBadge risk={c.risk} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {EXAMPLES.map((example) => (
            <ExampleButton
              key={example.risk}
              risk={example.risk}
              title={example.title}
              onPick={(id) => {
                setNotice("");
                onSelect(id);
              }}
            />
          ))}
        </div>
      </Card>

      {selectedId ? (
        <PredictionPanel accountId={selectedId} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
          Pick an account above to generate its prediction.
        </div>
      )}
    </div>
  );
}
