"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "./lib/api";
import { useApi } from "./lib/useApi";
import About from "./components/About";
import Customers from "./components/Customers";
import Dashboard from "./components/Dashboard";
import Predictions from "./components/Predictions";
import { Icon } from "./components/ui";

const NAV = ["Dashboard", "Customers", "Predictions", "About Project"];

// Each page has a URL hash so the browser Back button and shared links work:
//   #/dashboard   #/customers   #/customers/ACC_00041
//   #/predictions   #/predictions/ACC_00041   #/about
const SLUG = {
  Dashboard: "dashboard",
  Customers: "customers",
  Predictions: "predictions",
  "About Project": "about",
};
const FROM_SLUG = Object.fromEntries(Object.entries(SLUG).map(([k, v]) => [v, k]));

function parseHash() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/");
  const tab = FROM_SLUG[parts[0]] || "Dashboard";
  const id = parts[1] ? decodeURIComponent(parts[1]) : "";
  return { tab, id };
}

function ConnectionPill() {
  const health = useApi("/health");
  let label = "Checking API…";
  let dot = "bg-slate-400";
  if (!health.loading && !health.error) {
    label = "Model API connected";
    dot = "bg-emerald-500";
  } else if (health.error) {
    label = "API offline";
    dot = "bg-rose-500";
  } else if (health.retrying) {
    label = "API waking up…";
    dot = "bg-amber-500";
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export default function Home() {
  // null until the browser address (#/...) has been read, so a deep link never flashes the Dashboard first.
  const [route, setRoute] = useState(null);

  useEffect(() => {
    const sync = () => setRoute(parseHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const go = useCallback((tab, id = "") => {
    const hash = `#/${SLUG[tab]}${id ? `/${encodeURIComponent(id)}` : ""}`;
    window.location.hash = hash;
    window.scrollTo({ top: 0 });
  }, []);

  const { tab, id } = route || { tab: "", id: "" };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 px-4 py-6 md:flex">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-lg font-bold text-white">
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ChurnSense</p>
            <p className="text-xs text-slate-400">B2B Churn Predictor</p>
          </div>
        </div>

        <nav aria-label="Main" className="space-y-2">
          {NAV.map((item) => (
            <button
              key={item}
              onClick={() => go(item)}
              aria-current={tab === item ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                tab === item
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon type={item} />
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-xl bg-slate-800 p-4">
          <p className="text-xs font-semibold text-white">Live model connection</p>
          <p className="mt-1 text-xs text-slate-400">
            Every number on this site comes from the trained Random Forest model and the real
            dataset.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
              C
            </div>
            <span className="text-sm font-semibold">ChurnSense</span>
          </div>
          <p className="hidden text-sm text-slate-500 md:block">
            Dynamic B2B Customer Churn Predictor
          </p>
          <ConnectionPill />
        </header>

        <nav aria-label="Mobile" className="flex gap-2 overflow-x-auto bg-slate-900 px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <button
              key={item}
              onClick={() => go(item)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs ${
                tab === item ? "bg-violet-600 text-white" : "text-slate-300"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-8">
          {route === null && null}
          {tab === "Dashboard" && (
            <Dashboard onOpenCustomer={(accountId) => go("Predictions", accountId)} onNavigate={go} />
          )}
          {tab === "Customers" && (
            <Customers
              selectedId={id}
              onSelect={(accountId) => go("Customers", accountId)}
              onClear={() => go("Customers")}
            />
          )}
          {tab === "Predictions" && (
            <Predictions selectedId={id} onSelect={(accountId) => go("Predictions", accountId)} />
          )}
          {tab === "About Project" && <About />}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-400 sm:px-8">
          ChurnSense · Dynamic B2B Customer Churn Predictor · Machine-learning decision-support
          system · API: {API_BASE.replace(/^https?:\/\//, "")}
        </footer>
      </div>
    </div>
  );
}
