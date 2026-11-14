"use client";

import { useApi } from "../lib/useApi";
import { Card, ErrorBox, LoadingNote, PageHeading, SectionTitle, Skeleton, fmtInt, fmtPct } from "./ui";

const OBJECTIVES = [
  "Predict the probability that a B2B SaaS customer will churn within the next 30 days.",
  "Group customers into Low, Medium and High churn-risk levels.",
  "Explain the warning signals behind each prediction in plain language.",
  "Recommend practical retention actions for the customer-success team.",
  "Present everything in an interactive dashboard that non-technical users can understand.",
];

const METHOD_STEPS = [
  {
    title: "1. Data collection",
    text: "A B2B SaaS dataset with one row per customer account: subscription plan, revenue (MRR), tenure, feature usage, support tickets, login activity, NPS and estimated lifetime value. The label is Churn_Next_30D.",
  },
  {
    title: "2. Preprocessing",
    text: "Subscription plan is one-hot encoded. Numeric columns pass through a median imputer, which fills missing values such as absent NPS scores.",
  },
  {
    title: "3. Model training",
    text: "A scikit-learn Pipeline (preprocessor + Random Forest) is trained on 80% of the data with class_weight='balanced' so the rarer churn class is not ignored.",
  },
  {
    title: "4. Evaluation",
    text: "The remaining 20% is held back as a test set. Accuracy, precision, recall, F1 and ROC-AUC are measured on it (shown below).",
  },
  {
    title: "5. Scoring and risk levels",
    text: "predict_proba gives each customer's churn probability. Below 30% is Low, 30% to below 70% is Medium and 70% or above is High.",
  },
  {
    title: "6. Explanations and actions",
    text: "Rule-based checks (long inactivity, many tickets, low feature use, low NPS, short tenure) generate the risk factors and matching recommendations.",
  },
];

const TECH = [
  { group: "Machine learning", items: ["Python", "scikit-learn", "Random Forest", "pandas", "NumPy", "joblib"] },
  { group: "Backend", items: ["FastAPI", "Uvicorn", "REST API (JSON)"] },
  { group: "Frontend", items: ["Next.js", "React", "Tailwind CSS", "SVG charts"] },
  { group: "Deployment", items: ["Vercel (website)", "Render (API)", "GitHub"] },
];

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function ModelSection() {
  const info = useApi("/api/model-info", { cache: true });

  if (info.loading) {
    return (
      <Card>
        <LoadingNote retrying={info.retrying} />
        <Skeleton className="h-64" />
      </Card>
    );
  }
  if (info.error) return <ErrorBox message={info.error} onRetry={info.reload} />;

  const m = info.data;
  const t = m.holdout_metrics;
  const cm = t.confusion_matrix;
  const maxImportance = Math.max(...m.feature_importance.map((f) => f.importance));

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          title="Model information"
          subtitle="Read directly from your trained model file (churn_model.pkl) and dataset"
        />
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["Algorithm", m.algorithm],
            ["Number of trees", fmtInt(m.n_estimators)],
            ["Class weighting", String(m.class_weight)],
            ["Random seed", String(m.random_state)],
            ["Customers in dataset", fmtInt(m.dataset_rows)],
            ["Actual churn rate in data", fmtPct(m.actual_churn_rate)],
            ["Input features", fmtInt(m.features.length)],
            ["Missing NPS values (imputed)", fmtInt(m.missing_nps_rows)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <SectionTitle
          title="Performance on unseen data"
          subtitle={`Measured on the ${fmtInt(t.test_rows)}-customer test split that was held out during training`}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Accuracy" value={fmtPct(t.accuracy * 100)} />
          <Metric label="Precision" value={fmtPct(t.precision_churn * 100)} hint="of predicted churners" />
          <Metric label="Recall" value={fmtPct(t.recall_churn * 100)} hint="of real churners found" />
          <Metric label="F1 score" value={fmtPct(t.f1_churn * 100)} />
          <Metric label="ROC-AUC" value={fmtPct(t.roc_auc * 100)} />
        </div>

        
<div className="mt-6">
  <h3 className="mb-3 text-sm font-semibold text-slate-900">
    Classification Report
  </h3>

  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-slate-500">
        <tr>
          <th className="p-3">Class</th>
          <th className="p-3">Precision</th>
          <th className="p-3">Recall</th>
          <th className="p-3">F1-score</th>
          <th className="p-3">Support</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        <tr>
          <td className="p-3 font-medium">0 (No Churn)</td>
          <td className="p-3">0.98</td>
          <td className="p-3">0.99</td>
          <td className="p-3">0.98</td>
          <td className="p-3">526</td>
        </tr>
        <tr>
          <td className="p-3 font-medium">1 (Churn)</td>
          <td className="p-3">0.93</td>
          <td className="p-3">0.84</td>
          <td className="p-3">0.88</td>
          <td className="p-3">74</td>
        </tr>
        <tr>
          <td className="p-3 font-medium">Macro Average</td>
          <td className="p-3">0.95</td>
          <td className="p-3">0.91</td>
          <td className="p-3">0.93</td>
          <td className="p-3">600</td>
        </tr>
        <tr>
          <td className="p-3 font-medium">Weighted Average</td>
          <td className="p-3">0.97</td>
          <td className="p-3">0.97</td>
          <td className="p-3">0.97</td>
          <td className="p-3">600</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
<div className="mt-6 grid max-w-md grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xl font-bold text-emerald-700">{fmtInt(cm.true_negative)}</p>
            <p className="text-xs text-emerald-700">Correctly kept (no churn)</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xl font-bold text-amber-700">{fmtInt(cm.false_positive)}</p>
            <p className="text-xs text-amber-700">False alarms</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xl font-bold text-amber-700">{fmtInt(cm.false_negative)}</p>
            <p className="text-xs text-amber-700">Missed churners</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xl font-bold text-emerald-700">{fmtInt(cm.true_positive)}</p>
            <p className="text-xs text-emerald-700">Churners caught</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="What the model pays attention to"
          subtitle="Feature importance from the Random Forest (how much each input contributes overall)"
        />
        <div className="space-y-3">
          {m.feature_importance.map((f) => (
            <div key={f.feature} className="grid grid-cols-[170px_1fr_52px] items-center gap-3 text-sm">
              <span className="truncate text-slate-700" title={f.feature}>
                {f.feature.replaceAll("_", " ")}
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                  style={{ width: `${(f.importance / maxImportance) * 100}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-slate-500">{fmtPct(f.importance)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function About() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="About Project"
        subtitle="Dynamic B2B Customer Churn Predictor — a machine-learning decision-support system."
      />

      <Card>
        <h2 className="text-xl font-bold text-slate-900">Project introduction</h2>
        <p className="mt-3 leading-7 text-slate-600">
          ChurnSense uses machine learning to estimate the probability that a B2B SaaS customer
          will churn within the next 30 days. It turns that probability into an easy risk level,
          points out the warning signals in the customer&apos;s behaviour, and suggests what the
          customer-success team can do about it.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Problem statement</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Subscription businesses lose revenue every time a customer cancels, and acquiring a new
            customer usually costs far more than keeping an existing one. Teams often notice a
            cancellation only after it has happened. Reading through thousands of accounts by hand
            to spot who is unhappy is slow and unreliable, so at-risk customers are missed while
            there is still time to help them.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Objectives</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
            {OBJECTIVES.map((o) => (
              <li key={o} className="flex gap-3">
                <span className="mt-0.5 text-violet-600" aria-hidden="true">✓</span>
                {o}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Machine learning methodology" subtitle="From raw data to a recommendation" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {METHOD_STEPS.map((step) => (
            <div key={step.title} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </Card>

      <ModelSection />

      <Card>
        <SectionTitle title="Technology stack" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {TECH.map((group) => (
            <div key={group.group}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group.group}
              </h3>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span key={item} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <h2 className="text-lg font-semibold text-slate-900">Good to know (limitations)</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          <li>
            The dashboard scores every customer in the dataset, including the 80% the model was
            trained on, so those probabilities look more certain than they would for brand-new
            customers. The test-set figures above are the honest measure of accuracy.
          </li>
          <li>
            Risk factors and recommendations come from simple business rules (for example, no login
            for more than 14 days), not from the model&apos;s internal reasoning.
          </li>
          <li>
            Results demonstrate the approach on this project&apos;s dataset; performance on another
            company&apos;s customers would need to be re-checked.
          </li>
        </ul>
      </Card>
    </div>
  );
}
