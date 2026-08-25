"use client";

import { useEffect, useMemo, useState } from "react";
import {
  claims,
  contextAllowed,
  contextBlocked,
  builtInMethods,
  provenanceEvents,
  type Claim,
  type MethodCard,
} from "./data";
import { buildDecisionTrail, type ReportExecutionResult } from "./decisionTrail";
import HowItWorksView from "./HowItWorksView";
import MelanomaCaseStudyView, { type MelanomaWorkflowOutput } from "./MelanomaCaseStudyView";
import { defaultMelanomaPlan, type MelanomaWorkflowPlan } from "./melanomaWorkflow";

type View = "overview" | "how" | "example" | "projects" | "analysis" | "execution" | "controlled" | "trust" | "claims" | "methods" | "provenance";

type ExecutionResult = ReportExecutionResult;

type Theme = "light" | "dark";

const nav: Array<{ view: View; label: string; glyph: string; group?: string; count?: number }> = [
  { view: "how", label: "How it works", glyph: "?", group: "Start" },
  { view: "example", label: "Example", glyph: "◎" },
  { view: "controlled", label: "Controlled R runner", glyph: "↗", group: "Real data" },
  { view: "trust", label: "Review result", glyph: "◇", group: "Evidence" },
  { view: "claims", label: "Claims", glyph: "≡", count: 4 },
  { view: "methods", label: "Method library", glyph: "◫" },
  { view: "provenance", label: "Provenance", glyph: "⌘" },
];

const viewTitle: Record<View, string> = {
  overview: "Overview",
  how: "How it works",
  example: "Interactive analysis example",
  projects: "Projects",
  analysis: "Analysis plan",
  execution: "Synthetic analysis execution",
  controlled: "Controlled real-data execution",
  trust: "Result review",
  claims: "Claim ledger",
  methods: "Method library",
  provenance: "Provenance",
};

const recommendedWording =
  "In this synthetic melanoma cohort, the adjusted feature-level analysis identifies a response-associated T-cell and interferon pattern. This does not establish causation, treatment benefit, immune-cell abundance, or a validated biomarker.";

function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" | "gray" | "red" | "blue" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- native dialog backdrop click-to-dismiss
    <dialog className="modal-backdrop" open aria-label={title} onCancel={onClose} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal ${wide ? "wide" : ""}`}>
        <header><div><span className="modal-kicker">BioTrust AI</span><h2>{title}</h2></div><button className="close-button" onClick={onClose} aria-label="Close">×</button></header>
        {children}
      </section>
    </dialog>
  );
}

function AddMethodCardModal({ onClose, onSave }: { onClose: () => void; onSave: (method: MethodCard) => void }) {
  const [form, setForm] = useState({
    name: "", package: "", fn: "", category: "Differential expression", question: "",
    notAnswered: "", appropriate: "", assumptions: "", failureModes: "", alternatives: "", validation: "", officialDocumentation: "",
  });
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const toList = (value: string) => value.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.package.trim() || !form.fn.trim() || !form.question.trim()) return;
    onSave({
      slug: `custom-${Date.now()}`,
      name: form.name.trim(),
      package: form.package.trim(),
      fn: form.fn.trim(),
      category: form.category.trim() || "Other",
      status: "REVIEW_REQUIRED",
      origin: "CUSTOM",
      question: form.question.trim(),
      notAnswered: toList(form.notAnswered),
      appropriate: toList(form.appropriate),
      assumptions: toList(form.assumptions),
      failureModes: toList(form.failureModes),
      alternatives: toList(form.alternatives),
      validation: toList(form.validation),
      officialDocumentation: form.officialDocumentation.trim() || undefined,
    });
  };
  const listField = (label: string, field: keyof typeof form, placeholder: string) => <label>{label}<textarea value={form[field]} onChange={(event) => update(field, event.target.value)} placeholder={placeholder} /></label>;
  return <Modal title="Add a Method Card" onClose={onClose} wide><form className="method-form" onSubmit={submit}><div className="method-form-note"><span>i</span><p><strong>Documentation, not execution</strong>Adding a Method Card makes a method available for planning and review. It never enables arbitrary code execution.</p></div><div className="method-form-grid"><label>Method name *<input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. My validated workflow" /></label><label>Package or framework *<input required value={form.package} onChange={(event) => update("package", event.target.value)} placeholder="e.g. packageName" /></label><label>Function or entry point *<input required value={form.fn} onChange={(event) => update("fn", event.target.value)} placeholder="e.g. fitModel" /></label><label>Category<select value={form.category} onChange={(event) => update("category", event.target.value)}><option>Differential expression</option><option>Gene-set testing</option><option>Association</option><option>Validation</option><option>Batch adjustment</option><option>Unwanted variation</option><option>Repeated measures</option><option>Exploratory analysis</option><option>Other</option></select></label></div><label>What scientific question does it answer? *<textarea required value={form.question} onChange={(event) => update("question", event.target.value)} placeholder="State the estimand or hypothesis precisely." /></label><div className="method-form-grid lists">{listField("What it does not answer", "notAnswered", "One item per line")}{listField("Appropriate when", "appropriate", "One condition per line")}{listField("Assumptions", "assumptions", "One assumption per line")}{listField("Common failure modes", "failureModes", "One failure mode per line")}{listField("Alternatives", "alternatives", "One alternative per line")}{listField("Recommended validation", "validation", "One check per line")}</div><label>Official documentation URL<input type="url" value={form.officialDocumentation} onChange={(event) => update("officialDocumentation", event.target.value)} placeholder="https://…" /></label><footer><span>Custom cards are stored on this device and marked REVIEW REQUIRED.</span><div><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Add Method Card <span>＋</span></button></div></footer></form></Modal>;
}

function Sidebar({ active, hasResults, theme, onNavigate, onPrivacy, onToggleTheme }: { active: View; hasResults: boolean; theme: Theme; onNavigate: (view: View) => void; onPrivacy: () => void; onToggleTheme: () => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate("how")} aria-label="BioTrust AI home">
        <span className="brand-mark" aria-hidden="true"><span className="trail-segment first" /><span className="trail-segment second" /><span className="trail-node first" /><span className="trail-node second" /><span className="trail-node third" /></span>
        <span>BioTrust <i>AI</i></span>
      </button>
      <nav aria-label="Primary navigation">
        {nav.map((item) => (
          <div key={item.view}>
            {item.group && <p className="nav-label">{item.group}</p>}
            <button className={`nav-item ${active === item.view ? "active" : ""}`} onClick={() => onNavigate(item.view)}>
              <span>{item.glyph}</span>{item.label}{item.count && hasResults && <b>{item.count}</b>}
            </button>
          </div>
        ))}
      </nav>
      <button className="privacy-card" onClick={onPrivacy}>
        <span className="privacy-row"><span className="lock">●</span><strong>No external AI</strong></span>
        <span className="privacy-copy">Raw data stays inside the local computation boundary.</span>
        <span className="privacy-action">Inspect privacy boundary <span>→</span></span>
      </button>
      <button className="sidebar-theme-toggle" aria-label="Change appearance" title="Change appearance" onClick={onToggleTheme}><span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span><strong>Change appearance</strong></button>
    </aside>
  );
}

function Topbar({ view, canExport, onExport, onMenu }: { view: View; canExport: boolean; onExport: () => void; onMenu: () => void }) {
  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMenu}>☰</button>
      <div className="breadcrumbs"><span>BioTrust workspace</span><b>/</b><strong>{viewTitle[view]}</strong></div>
      <div className="top-actions">{canExport && <button className="export-btn" onClick={onExport} title="Export the current audit record">Export audit <span>↗</span></button>}</div>
    </header>
  );
}

function OverviewView({ navigate, openPrivacy, hasResults }: { navigate: (view: View) => void; openPrivacy: () => void; hasResults: boolean }) {
  const stats = hasResults ? [
    ["Registered datasets", "1", "Synthetic only", "□"],
    ["Analysis plans", "5", "4 completed", "⌁"],
    ["Scientific claims", "4", "1 needs review", "≡"],
    ["Provenance coverage", "100%", "All runs traceable", "⌘"],
  ] : [
    ["Registered datasets", "1", "Synthetic fixture ready", "□"],
    ["Analysis plans", "1", "Ready for demonstration", "⌁"],
    ["Scientific claims", "0", "Created only after a run", "≡"],
    ["Provenance coverage", "—", "No completed run yet", "⌘"],
  ];
  return (
    <div className="view overview-view">
      <section className="welcome-row">
        <div><span className="page-kicker">Research workspace</span><h1>Evidence before confidence.</h1><p>Trace every scientific decision from question to claim—without exposing raw research data to external AI.</p></div>
        <button className="primary-button" onClick={() => navigate("analysis")}>{hasResults ? "Create a new analysis plan" : "Choose analyses and methods"} <span>→</span></button>
      </section>
      <button className="mode-banner" onClick={openPrivacy}>
        <span className="mode-icon">●</span><span><strong>NO_EXTERNAL_AI_MODE is active</strong><small>All reasoning is deterministic and local. No payload can leave the computation boundary.</small></span><span className="mode-link">Inspect policy →</span>
      </button>
      <section className="stat-grid">
        {stats.map(([label, value, sub, glyph]) => <article className="stat-card" key={label}><span className="stat-glyph">{glyph}</span><small>{label}</small><strong>{value}</strong><p>{sub}</p></article>)}
      </section>
      <div className="overview-grid">
        <section className="panel workflow-panel">
          <div className="section-head"><div><span className="panel-icon">⌁</span><div><h2>Current analysis workflow</h2><p>{hasResults ? "Melanoma TME · researcher-selected plan" : "Synthetic melanoma · waiting for a plan"}</p></div></div><Badge tone={hasResults ? "green" : "gray"}>{hasResults ? "RUN COMPLETE" : "PLAN REQUIRED"}</Badge></div>
          <div className="workflow-track">
            {(hasResults ? [
              ["1", "Question defined", "Researcher approved"],
              ["2", "Plan locked", "Formula confirmed"],
              ["3", "Analysis run", "Hashes recorded"],
              ["4", "Claims reviewed", "1 caveat attached"],
            ] : [
              ["1", "Example available", "180 synthetic melanoma tumors"],
              ["2", "Choices open", "Select analyses and methods"],
              ["3", "Run pending", "Confirm Analysis plan first"],
              ["4", "Results hidden", "Revealed after execution"],
            ]).map(([n, title, meta], index) => <div className={`workflow-step ${!hasResults ? "pending" : ""}`} key={n}><span className="step-dot">{hasResults && index < 3 ? "✓" : n}</span><div><strong>{title}</strong><small>{meta}</small></div>{index < 3 && <i />}</div>)}
          </div>
          <button className="text-button" onClick={() => navigate(hasResults ? "trust" : "analysis")}>{hasResults ? "Review result evidence" : "Choose analyses and methods"} <span>→</span></button>
        </section>
        <section className="panel recent-panel">
          <div className="section-head"><div><span className="panel-icon">≡</span><div><h2>Recent claims</h2><p>Structured scientific statements</p></div></div><button className="quiet-button" onClick={() => navigate("claims")}>View all</button></div>
          {hasResults ? <div className="mini-claims">
            {claims.slice(0, 3).map((claim) => <button key={claim.id} onClick={() => navigate("claims")}><span><Badge tone={claim.type === "HYPOTHESIS" ? "amber" : claim.type === "DATA" ? "blue" : "green"}>{claim.type}</Badge><small>{claim.id}</small></span><p>{claim.text}</p><i>›</i></button>)}
          </div> : <div className="awaiting-results"><span>◇</span><strong>No demonstration results yet</strong><p>Claims will appear only after you explicitly run the synthetic analysis.</p><button onClick={() => navigate("execution")}>Go to Run analysis →</button></div>}
        </section>
      </div>
      <section className="principle-strip"><span className="quote-mark">“</span><div><strong>Don’t trust the AI. Trust the evidence trail.</strong><p>AI can propose, explain, and critique. Structured analysis records and executed outputs remain authoritative.</p></div><button onClick={() => navigate("provenance")}>See the trail <span>→</span></button></section>
    </div>
  );
}

function ProjectsView({ navigate, hasResults }: { navigate: (view: View) => void; hasResults: boolean }) {
  return (
    <div className="view">
      <div className="page-head"><div><span className="page-kicker">Workspace</span><h1>Projects</h1><p>Local research workspaces with explicit privacy and provenance controls.</p></div><button className="primary-button" disabled title="Project creation is disabled in the synthetic demo">New project <span>＋</span></button></div>
      <section className="project-card">
        <div className="project-main"><div className="project-monogram">MT</div><div><span className="project-title-row"><h2>Synthetic melanoma TME study</h2><Badge>SYNTHETIC</Badge></span><p>Researcher-configurable workspace for method selection, comparison, sensitivity analysis, neural integration, and auditable interpretation.</p><div className="project-meta"><span>1 dataset</span><i>·</i><span>{hasResults ? "1 completed plan" : "0 completed plans"}</span><i>·</i><span>{hasResults ? "4 generated claims" : "0 generated claims"}</span><i>·</i><span>{hasResults ? "Run completed this session" : "Plan not yet confirmed"}</span></div></div></div>
        <div className="project-actions"><Badge tone="gray">BROWSER COMPUTE</Badge><button className="secondary-button" onClick={() => navigate("analysis")}>Open analysis plan <span>→</span></button></div>
      </section>
      <div className="two-columns">
        <section className="panel dataset-panel"><div className="section-head"><div><span className="panel-icon">□</span><div><h2>Dataset registry</h2><p>Hash-addressed local inputs</p></div></div><Badge tone="green">VERIFIED</Badge></div><div className="dataset-row"><div className="dataset-file">CSV</div><div><strong>SYN-MEL-20260825</strong><small>Melanoma RNA-seq counts + sample metadata</small></div><div><span>180 samples</span><small>1,200 features</small></div><div><span>seed</span><small>20260825</small></div></div><div className="dataset-note"><span>✓</span><p><strong>Confidentiality-safe fixture</strong>All tumors, expression counts, covariates, response labels, and outcomes are synthetic.</p></div></section>
        <section className="panel boundary-mini"><div className="section-head"><div><span className="panel-icon">◉</span><div><h2>Data boundary</h2><p>Current project policy</p></div></div></div><div className="boundary-flow"><div><Badge tone="red">CONFIDENTIAL SIDE</Badge><strong>Raw inputs</strong><small>Local computation only</small></div><span>→</span><div><Badge>AI-SAFE SIDE</Badge><strong>Sanitized summaries</strong><small>Explicit allowlist only</small></div></div><p className="fine-print">The current mode blocks all external AI communication, including allowed summaries.</p></section>
      </div>
    </div>
  );
}

function ExecutionView({ onToast }: { onToast: (message: string) => void }) {
  const [runtime, setRuntime] = useState<{ state: "checking" | "ready" | "unavailable"; apiBase: string; location: "local" | "online" | "none" }>({ state: "checking", apiBase: "", location: "none" });
  const [countsFile, setCountsFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [method, setMethod] = useState("edger_qlf");
  const [researchQuestion, setResearchQuestion] = useState("Within Tissue_A, which expression features differ between Exposure_A Group_B and Group_A after adjustment for Technical_Batch?");
  const [conditionColumn, setConditionColumn] = useState("condition");
  const [referenceLevel, setReferenceLevel] = useState("Group_A");
  const [comparisonLevel, setComparisonLevel] = useState("Group_B");
  const [covariates, setCovariates] = useState("Technical_Batch");
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  useEffect(() => {
    const localBrowser = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    const configuredApi = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    const apiBase = configuredApi || (localBrowser ? "http://localhost:8000" : "");
    if (!apiBase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- availability is known only after the browser environment is inspected
      setRuntime({ state: "unavailable", apiBase: "", location: "none" });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    fetch(`${apiBase}/api/execution/health`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { status?: string };
        if (!response.ok || body.status !== "ready") throw new Error("Runner is not ready");
        setRuntime({ state: "ready", apiBase, location: localBrowser ? "local" : "online" });
      })
      .catch(() => setRuntime({ state: "unavailable", apiBase, location: localBrowser ? "local" : "online" }))
      .finally(() => window.clearTimeout(timer));
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);
  const download = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const downloadResults = (target: ExecutionResult) => {
    const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = target.results.map((row) => [row.feature_id, row.log2_fold_change, row.statistic, row.p_value, row.adjusted_p_value].map(escape).join(","));
    download(["feature_id,log2_fold_change,statistic,p_value,adjusted_p_value", ...rows].join("\n"), `${target.execution_id}-results.csv`, "text/csv");
    onToast("Result table downloaded");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (runtime.state !== "ready" || !countsFile || !metadataFile || !planConfirmed) return;
    setRunning(true);
    setError("");
    setResult(null);
    const form = new FormData();
    form.set("method", method);
    form.set("condition_column", conditionColumn);
    form.set("reference_level", referenceLevel);
    form.set("comparison_level", comparisonLevel);
    form.set("covariates", covariates);
    form.set("counts_file", countsFile);
    form.set("metadata_file", metadataFile);
    try {
      const response = await fetch(`${runtime.apiBase}/api/executions/run`, { method: "POST", body: form });
      const body = await response.json() as ExecutionResult | { detail?: string };
      if (!response.ok) throw new Error("detail" in body && body.detail ? body.detail : "The controlled analysis could not be completed");
      setResult(body as ExecutionResult);
      onToast("Controlled analysis completed and hashed");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The local execution service is unavailable");
    } finally {
      setRunning(false);
    }
  };
  const formatNumber = (value: number | null) => value === null ? "NA" : Math.abs(value) < .001 && value !== 0 ? value.toExponential(2) : value.toFixed(3);
  const visibleResult = result;
  const resultIsSynthetic = false;
  const selectedMethodName = method === "deseq2_wald" ? "DESeq2 Wald test" : "edgeR quasi-likelihood";
  const selectedCovariates = covariates.split(",").map((item) => item.trim()).filter(Boolean);
  const downloadPdf = async (target: ExecutionResult) => {
    const synthetic = target.execution_id.startsWith("SYN-");
    const { downloadAnalysisReport } = await import("./report");
    downloadAnalysisReport({
      result: target,
      isSynthetic: synthetic,
      projectName: synthetic ? "Synthetic transcriptomic association study" : "Controlled RNA-seq analysis",
      datasetName: synthetic ? "Synthetic_Cohort" : countsFile?.name ?? "Researcher dataset",
      researchQuestion: synthetic ? "Within Tissue_A, which expression features differ between Exposure_A Group_B and Group_A after adjustment for Technical_Batch?" : researchQuestion,
      conditionColumn,
      covariates: synthetic ? ["Technical_Batch"] : selectedCovariates,
    });
    onToast("Scientific PDF report downloaded");
  };
  const runProgress = visibleResult ? 4 : planConfirmed ? 2 : 1;
  return (
    <div className="view execution-view">
      <div className="page-head"><div><span className="page-kicker">Controlled R computation</span><h1>Run edgeR or DESeq2 on an authorized real dataset.</h1><p>This separate runner is for count-native publication analysis. The public Example keeps its selectable plan, Run control, browser-R results, and interpretation together on one page.</p></div><Badge tone={runtime.state === "ready" ? "green" : runtime.state === "checking" ? "blue" : "gray"}>{runtime.state === "checking" ? "CHECKING RUNNER" : runtime.state === "ready" ? `${runtime.location.toUpperCase()} RUNNER READY` : "RUNNER NOT CONNECTED"}</Badge></div>
      <section className="run-progress" aria-label="Current analysis progress">
        {[["1", "Define", "Question and inputs"], ["2", "Confirm", "Exact analysis plan"], ["3", "Run", "Controlled execution"], ["4", "Review", "Results and downloads"]].map(([number, title, detail], index) => <div className={index + 1 <= runProgress ? "active" : ""} key={number}><span>{index + 1 < runProgress ? "✓" : number}</span><p><strong>{title}</strong><small>{detail}</small></p></div>)}
      </section>
      {runtime.state === "unavailable" && <section className="hosted-execution-notice"><span>⌂</span><div><strong>The secure real-data runner is not connected to this public page.</strong><p>The selectable synthetic melanoma workflow still works online in Example. For authorized real-data analysis, run the controlled service locally with <code>docker compose up --build</code> or connect an authenticated isolated runner.</p></div><a href="https://github.com/Hasnat-HN/BioTrust-AI" target="_blank" rel="noreferrer">Open setup guide <span>↗</span></a></section>}
      {runtime.state === "ready" && runtime.location === "online" && <section className="online-execution-notice"><span>✓</span><div><strong>Controlled online runner connected</strong><p>Only upload data you are authorized to process. The runner validates inputs, uses temporary storage, and returns a hashed record.</p></div></section>}
      <div className="execution-layout">
        <form className="panel execution-form" onSubmit={submit}>
          <div className="section-head"><div><span className="panel-icon">▶</span><div><h2>Real-data analysis</h2><p>{runtime.location === "online" ? "Files are sent only to the configured controlled runner" : "Files remain inside the temporary local runner"}</p></div></div><Badge tone="blue">ALLOWLISTED</Badge></div>
          <label className="execution-question">1 · Research question<textarea value={researchQuestion} disabled={runtime.state !== "ready" || running} onChange={(event) => { setResearchQuestion(event.target.value); setPlanConfirmed(false); }} /></label>
          <div className="execution-files">
            <label><span>2 · Count matrix CSV</span><input type="file" accept=".csv,text/csv" disabled={runtime.state !== "ready" || running} onChange={(event) => { setCountsFile(event.target.files?.[0] ?? null); setPlanConfirmed(false); }} /><small>{countsFile?.name ?? "First column: feature_id; remaining columns: samples"}</small></label>
            <label><span>2 · Sample metadata CSV</span><input type="file" accept=".csv,text/csv" disabled={runtime.state !== "ready" || running} onChange={(event) => { setMetadataFile(event.target.files?.[0] ?? null); setPlanConfirmed(false); }} /><small>{metadataFile?.name ?? "Must include sample_id and the selected condition"}</small></label>
          </div>
          <div className="execution-fields">
            <label>4 · Method<select value={method} disabled={runtime.state !== "ready" || running} onChange={(event) => { setMethod(event.target.value); setPlanConfirmed(false); }}><option value="edger_qlf">edgeR quasi-likelihood</option><option value="deseq2_wald">DESeq2 Wald test</option></select></label>
            <label>3 · Condition column<input value={conditionColumn} disabled={runtime.state !== "ready" || running} onChange={(event) => { setConditionColumn(event.target.value); setPlanConfirmed(false); }} /></label>
            <label>5 · Reference level<input value={referenceLevel} disabled={runtime.state !== "ready" || running} onChange={(event) => { setReferenceLevel(event.target.value); setPlanConfirmed(false); }} /></label>
            <label>5 · Comparison level<input value={comparisonLevel} disabled={runtime.state !== "ready" || running} onChange={(event) => { setComparisonLevel(event.target.value); setPlanConfirmed(false); }} /></label>
          </div>
          <label className="execution-covariates">5 · Covariates <small>Comma-separated metadata columns; leave empty for none</small><input value={covariates} disabled={runtime.state !== "ready" || running} onChange={(event) => { setCovariates(event.target.value); setPlanConfirmed(false); }} placeholder="batch,sex" /></label>
          <div className="method-explanation"><span>Why</span><p><strong>Why {selectedMethodName}?</strong>{method === "deseq2_wald" ? "It is an allowlisted replicated-count workflow that estimates dispersion and evaluates the declared contrast with a Wald test." : "It is an allowlisted replicated-count workflow that models dispersion and uses quasi-likelihood testing for the declared contrast."}</p></div>
          <div className="execution-contract"><span>✓</span><p><strong>5 · Exact controlled request</strong><code>~ {selectedCovariates.join(" + ")}{covariates.trim() ? " + " : ""}{conditionColumn}</code><small>{comparisonLevel} versus {referenceLevel} · BH-adjusted p-values · no arbitrary formulas</small></p></div>
          <div className="execution-confirmation"><input id="confirm-execution-plan" type="checkbox" checked={planConfirmed} disabled={runtime.state !== "ready" || running} onChange={(event) => setPlanConfirmed(event.target.checked)} /><label htmlFor="confirm-execution-plan">I confirm this exact plan.<small>I reviewed the question, files, method, formula, contrast, covariates, and multiple-testing rule.</small></label></div>
          {error && <div className="execution-error" role="alert"><strong>Analysis not started</strong><span>{error}</span></div>}
          <button className="primary-button full" type="submit" disabled={runtime.state !== "ready" || !countsFile || !metadataFile || !planConfirmed || running}>{running ? "Running inside the controlled boundary…" : "6 · Run confirmed analysis"} <span>{running ? "◌" : "→"}</span></button>
        </form>
        <aside className="execution-aside">
          <section className="panel"><div className="section-head"><div><span className="panel-icon">◇</span><div><h2>Execution boundary</h2><p>What the adapter enforces</p></div></div></div><ul className="guard-list"><li><span>01</span><p><strong>Two fixed methods</strong>edgeR QL and DESeq2 Wald only</p></li><li><span>02</span><p><strong>Validated inputs</strong>Exact sample match and integer counts</p></li><li><span>03</span><p><strong>Temporary processing</strong>Uploads deleted after each request</p></li><li><span>04</span><p><strong>Auditable output</strong>Input, result, and software records</p></li></ul></section>
          <section className="panel input-limits"><h2>Default limits</h2><dl><div><dt>File size</dt><dd>50 MB each</dd></div><div><dt>Features</dt><dd>50,000</dd></div><div><dt>Samples</dt><dd>500</dd></div><div><dt>Runtime</dt><dd>15 minutes</dd></div><div><dt>Replication</dt><dd>≥ 2 per group</dd></div></dl></section>
        </aside>
      </div>
      {visibleResult && <section className="panel execution-results"><div className="result-head"><div><Badge tone={resultIsSynthetic ? "blue" : "green"}>{resultIsSynthetic ? "SYNTHETIC RUN COMPLETE" : "RUN COMPLETE"}</Badge><h2>{visibleResult.comparison} versus {visibleResult.reference}</h2><p>{visibleResult.execution_id} · {visibleResult.design}</p></div><div><button className="report-button" onClick={() => downloadPdf(visibleResult)}>Scientific PDF <span>↓</span></button><button className="secondary-button" onClick={() => download(JSON.stringify(visibleResult, null, 2), `${visibleResult.execution_id}-audit.json`, "application/json")}>Audit JSON <span>↓</span></button><button className="primary-button" onClick={() => downloadResults(visibleResult)}>Results CSV <span>↓</span></button></div></div>{resultIsSynthetic && <div className="synthetic-result-warning"><strong>Demonstration output only</strong><span>These fixed generic values do not describe a real organism, cohort, disease, or biological finding.</span></div>}<div className="run-facts"><span><small>Samples</small><strong>{visibleResult.sample_count}</strong></span><span><small>Input features</small><strong>{visibleResult.feature_count.toLocaleString()}</strong></span><span><small>Retained</small><strong>{visibleResult.retained_feature_count.toLocaleString()}</strong></span><span><small>Runtime</small><strong>{Object.entries(visibleResult.software_versions).map(([name, version]) => `${name} ${version}`).join(" · ")}</strong></span></div><div className="result-table-wrap"><table><thead><tr><th>Feature</th><th>log2 fold change</th><th>Statistic</th><th>p-value</th><th>Adjusted p-value</th></tr></thead><tbody>{visibleResult.results.slice(0, 100).map((row) => <tr key={row.feature_id}><td>{row.feature_id}</td><td>{formatNumber(row.log2_fold_change)}</td><td>{formatNumber(row.statistic)}</td><td>{formatNumber(row.p_value)}</td><td>{formatNumber(row.adjusted_p_value)}</td></tr>)}</tbody></table></div><div className="hash-record"><strong>Immutable run record</strong><code>counts {visibleResult.input_hashes.counts_sha256}</code><code>metadata {visibleResult.input_hashes.metadata_sha256}</code><code>output {visibleResult.output_hash}</code></div>{visibleResult.results.length > 100 && <p className="result-preview-note">Showing the first 100 adjusted-p-value-ranked features. The CSV download contains all {visibleResult.results.length.toLocaleString()} rows.</p>}</section>}
      {visibleResult && <section className="panel decision-trail"><div className="decision-trail-head"><div><span className="panel-icon">⌘</span><div><h2>Visible decision trail</h2><p>What happened, why it matters, what supports it, and what still needs review.</p></div></div><Badge tone="blue">NOT HIDDEN AI REASONING</Badge></div><div className="decision-trail-list">{buildDecisionTrail({ result: visibleResult, isSynthetic: resultIsSynthetic, datasetName: resultIsSynthetic ? "Synthetic_Cohort" : countsFile?.name ?? "Researcher dataset", researchQuestion: resultIsSynthetic ? "Which features differ between Group_B and Group_A under the fixed demonstration design?" : researchQuestion, conditionColumn, covariates: resultIsSynthetic ? ["Technical_Batch"] : selectedCovariates }).map((entry) => <article key={entry.process}><span className={entry.status === "COMPLETE" ? "complete" : "review"}>{entry.status === "COMPLETE" ? "✓" : "!"}</span><div><small>{entry.process}</small><h3>{entry.whatHappened}</h3><dl><div><dt>Why this matters</dt><dd>{entry.whyItMatters}</dd></div><div><dt>Evidence</dt><dd>{entry.evidence}</dd></div></dl></div><Badge tone={entry.status === "COMPLETE" ? "green" : "amber"}>{entry.status}</Badge></article>)}</div></section>}
    </div>
  );
}

function EvidenceProfile({ claim }: { claim: Claim }) {
  return <div className="evidence-list">{Object.entries(claim.evidence).map(([label, score]) => <div className="evidence-row" key={label}><span>{label}</span>{score === "NA" ? <small>N/A</small> : <div className="dots" aria-label={`${score} of 2`}><i className={score >= 1 ? "filled" : ""} /><i className={score >= 2 ? "filled" : ""} /></div>}</div>)}</div>;
}

function TrustView({ selected, setSelected, onRules, onToast }: { selected: Claim; setSelected: (claim: Claim) => void; onRules: () => void; onToast: (message: string) => void }) {
  return (
    <div className="view trust-view">
      <div className="eyebrow"><span>Result review</span><i>Run complete</i></div><h1>Can I trust this result?</h1><p className="lede">Inspect the evidence trail, unresolved uncertainty, and exactly what this analysis can support.</p>
      <div className="claim-selector"><label htmlFor="claim-select">Selected claim</label><select id="claim-select" value={selected.id} onChange={(event) => setSelected(claims.find((claim) => claim.id === event.target.value) ?? claims[0])}>{claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.id} · {claim.text}</option>)}</select></div>
      <article className="claim-card"><div className="claim-label"><span>{selected.id}</span><Badge tone={selected.type === "HYPOTHESIS" ? "amber" : selected.type === "DATA" ? "blue" : "green"}>{selected.type}</Badge></div><blockquote>“{selected.text}”</blockquote><div className="claim-meta"><span>{selected.status.replaceAll("_", " ").toLowerCase()}</span><b>·</b><small>{selected.source}</small></div></article>
      <div className="trust-grid">
        <section className="panel evidence-panel"><div className="panel-heading"><div><span className="panel-icon">◉</span><h2>Evidence profile</h2></div><Badge>SUPPORTED</Badge></div><p className="panel-copy">Transparent checks derived from analysis metadata—not an AI confidence score.</p><EvidenceProfile claim={selected} /><button className="text-button" onClick={onRules}>View scoring rules <span>→</span></button></section>
        <section className="panel review-panel"><div className="panel-heading"><div><span className="panel-icon warning">!</span><h2>Adversarial review</h2></div><Badge tone="amber">CAVEATS</Badge></div><p className="review-intro">The result is statistically supported, but the strongest interpretation remains limited by unresolved confounding.</p><div className="finding"><span>HIGH</span><div><strong>{selected.warning ?? "Interpretation requires conservative wording"}</strong><p>The evidence supports an association within this synthetic dataset, not a causal or mechanistic conclusion.</p></div></div><div className="finding muted"><span>CAUTION</span><div><strong>No external dataset replication</strong><p>The pattern has only been evaluated within the synthetic study.</p></div></div><button className="text-button" onClick={() => onToast("Full reviewer record is attached to the audit export")}>Open full review <span>→</span></button></section>
      </div>
      <section className="panel wording-panel"><div className="wording-head"><div><span className="panel-icon teal">✓</span><h2>Recommended scientific wording</h2></div><Badge>RULE-CHECKED</Badge></div><p>“{selected.id === "CLM-004" ? recommendedWording : selected.text}”</p><div className="wording-foot"><span>Prevents association → causation overreach</span><button onClick={async () => { await navigator.clipboard?.writeText(selected.id === "CLM-004" ? recommendedWording : selected.text); onToast("Scientific wording copied"); }}>Copy wording</button></div></section>
      <section className="trust-details-grid"><article><span>01</span><strong>What the data show</strong><p>The executed, researcher-selected browser methods produced feature effects, program summaries, sensitivity results, or neural prediction only when those modules were chosen.</p></article><article><span>02</span><strong>What the methods do not show</strong><p>Agreement across browser methods does not establish causality, mechanism, treatment benefit, cell abundance, or external replication.</p></article><article><span>03</span><strong>What would strengthen this?</strong><p>Run edgeR or DESeq2 in the controlled R service, inspect diagnostics, then reproduce the locked analysis in an independent melanoma cohort.</p></article></section>
    </div>
  );
}

function ClaimsView({ selected, setSelected }: { selected: Claim; setSelected: (claim: Claim) => void }) {
  const [filter, setFilter] = useState("ALL");
  const shown = filter === "ALL" ? claims : claims.filter((claim) => claim.type === filter);
  return (
    <div className="view">
      <div className="page-head"><div><span className="page-kicker">Scientific record</span><h1>Claim ledger</h1><p>Every statement is classified, sourced, and linked to its evidence limitations.</p></div><button className="primary-button" disabled title="Claim creation requires an active researcher session">New claim <span>＋</span></button></div>
      <div className="filter-tabs">{["ALL", "DATA", "INFERENCE", "HYPOTHESIS"].map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item === "ALL" ? "All claims" : item}<span>{item === "ALL" ? claims.length : claims.filter((claim) => claim.type === item).length}</span></button>)}</div>
      <div className="ledger-layout">
        <section className="ledger-table panel"><div className="ledger-head"><span>Claim</span><span>Classification</span><span>Status</span></div>{shown.map((claim) => <button className={`ledger-row ${selected.id === claim.id ? "selected" : ""}`} onClick={() => setSelected(claim)} key={claim.id}><div><small>{claim.id}</small><strong>{claim.text}</strong><p>{claim.source}</p></div><div><Badge tone={claim.type === "HYPOTHESIS" ? "amber" : claim.type === "DATA" ? "blue" : "green"}>{claim.type}</Badge></div><div><span className={`status-dot ${claim.status === "HYPOTHESIS" ? "amber" : ""}`} />{claim.status.replaceAll("_", " ")}</div></button>)}</section>
        <aside className="panel claim-detail"><div className="section-head"><div><span className="panel-icon">≡</span><div><h2>{selected.id}</h2><p>Claim inspection</p></div></div><Badge tone={selected.type === "HYPOTHESIS" ? "amber" : selected.type === "DATA" ? "blue" : "green"}>{selected.type}</Badge></div><blockquote>“{selected.text}”</blockquote><div className="detail-block"><strong>Source</strong><p>{selected.source}</p></div><div className="detail-block caution"><strong>Interpretation warning</strong><p>{selected.warning}</p></div><div className="detail-block"><strong>Provenance path</strong><p>Claim → selected output → researcher plan → SYN-MEL-20260825</p></div><button className="secondary-button full">Open evidence view <span>→</span></button></aside>
      </div>
    </div>
  );
}

function MethodsView({ catalog, onSelect, onAdd, onImport, onExport }: { catalog: MethodCard[]; onSelect: (method: MethodCard) => void; onAdd: () => void; onImport: (file: File) => void; onExport: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All methods");
  const categories = ["All methods", ...Array.from(new Set(catalog.map((method) => method.category)))];
  const shown = catalog.filter((method) => (category === "All methods" || method.category === category) && `${method.name} ${method.package} ${method.question}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="view">
      <div className="page-head methods-head"><div><span className="page-kicker">Extensible scientific knowledge</span><h1>Method library</h1><p>Choose from verified built-ins or document a method used by your own team.</p></div><div className="method-head-actions"><Badge tone="gray">{catalog.length} METHOD CARDS</Badge><button className="primary-button" onClick={onAdd}>Add Method Card <span>＋</span></button></div></div>
      <section className="method-library-banner"><div><span className="panel-icon">◫</span><p><strong>Built to grow with the science</strong>Built-in cards are curated from official documentation. Researcher-added cards stay local and are visibly marked for review.</p></div><div><button onClick={onExport}>Export method pack</button><label>Import method pack<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.currentTarget.value = ""; }} /></label></div></section>
      <div className="method-toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by method, package, or scientific question" /></label><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="method-grid">{shown.map((method) => <button className={`method-card ${method.origin === "CUSTOM" ? "custom" : ""}`} key={method.slug} onClick={() => onSelect(method)}><div className="method-card-top"><span className="method-logo">{method.name[0].toUpperCase()}</span><span className="method-badges">{method.origin === "CUSTOM" && <Badge tone="blue">CUSTOM</Badge>}<Badge tone={method.status === "VERIFIED" ? "green" : "amber"}>{method.status.replaceAll("_", " ")}</Badge></span></div><small>{method.category}</small><h2>{method.name}</h2><code>{method.package}::{method.fn}</code><p>{method.question}</p><div className="method-card-foot"><span>{method.assumptions.length} assumptions</span><i>Read Method Card →</i></div></button>)}</div>
      {shown.length === 0 && <div className="empty-state"><span>⌕</span><strong>No methods match this search.</strong><p>Try a method name, package, or broader category.</p></div>}
    </div>
  );
}

function ProvenanceView({ onExport }: { onExport: () => void }) {
  return (
    <div className="view">
      <div className="page-head"><div><span className="page-kicker">Append-only record</span><h1>Provenance timeline</h1><p>Where did this result come from? Every step resolves to code, inputs, and outputs.</p></div><button className="primary-button" onClick={onExport}>Export provenance JSON <span>↓</span></button></div>
      <div className="provenance-layout">
        <section className="panel timeline-panel"><div className="run-summary"><div><Badge>RUN COMPLETE</Badge><h2>Melanoma TME · researcher-selected analysis</h2><p>Run ID SYN-MEL-20260825 · deterministic seed 20260825</p></div><div><small>Runtime</small><strong>BROWSER</strong></div></div><div className="timeline">{provenanceEvents.map((event, index) => <article key={event.type}><span className="timeline-dot">{index === provenanceEvents.length - 1 ? "●" : "✓"}</span><time>{event.time}</time><div><Badge tone={event.type.includes("CLAIM") ? "amber" : event.type.includes("MODEL") ? "blue" : "gray"}>{event.type}</Badge><h3>{event.title}</h3><p>{event.detail}</p><small>{event.actor}</small></div></article>)}</div></section>
        <aside className="provenance-aside"><section className="panel hash-card"><div className="section-head"><div><span className="panel-icon">#</span><h2>Reproducibility record</h2></div><Badge>COMPLETE</Badge></div><dl><div><dt>Dataset</dt><dd><code>SYN-MEL-20260825</code></dd></div><div><dt>Metadata hash</dt><dd><code>FNV-1a audit record</code></dd></div><div><dt>Counts hash</dt><dd><code>FNV-1a audit record</code></dd></div><div><dt>Results hash</dt><dd><code>FNV-1a audit record</code></dd></div><div><dt>Browser engine</dt><dd>TypeScript</dd></div><div><dt>Production boundary</dt><dd>Controlled R</dd></div><div><dt>Random seed</dt><dd>20260825</dd></div></dl></section><section className="panel source-chain"><h2>Trace selected claim</h2><div><span>Claim</span><strong>CLM-004</strong></div><i>↓</i><div><span>Result</span><strong>Selected DGE + TME summary</strong></div><i>↓</i><div><span>Methods</span><strong>Researcher-selected</strong></div><i>↓</i><div><span>Plan</span><strong>Confirmed melanoma plan</strong></div><i>↓</i><div><span>Dataset</span><strong>SYN-MEL-20260825</strong></div></section></aside>
      </div>
    </div>
  );
}

function ResultsGate({ navigate, destination }: { navigate: (view: View) => void; destination: string }) {
  return <div className="view"><section className="results-gate"><span className="results-gate-mark">◇</span><span className="page-kicker">Results not generated</span><h1>{destination} will appear after a run.</h1><p>The public demonstration starts without preloaded outcomes. Open Example, select the analyses and methods, confirm them, and press Run on that same page.</p><button className="primary-button" onClick={() => navigate("example")}>Open interactive Example <span>→</span></button></section></div>;
}

export default function BioTrustApp() {
  const [view, setView] = useState<View>("how");
  const [theme, setTheme] = useState<Theme>("dark");
  const [syntheticResult, setSyntheticResult] = useState<ExecutionResult | null>(null);
  const [melanomaPlan, setMelanomaPlan] = useState<MelanomaWorkflowPlan>(defaultMelanomaPlan);
  const [melanomaOutput, setMelanomaOutput] = useState<MelanomaWorkflowOutput | null>(null);
  const [selectedClaim, setSelectedClaim] = useState(claims[0]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<MethodCard | null>(null);
  const [catalog, setCatalog] = useState<MethodCard[]>(builtInMethods);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("biotrust.custom-methods.v1") ?? "[]") as MethodCard[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the local-only method catalog after mount
      if (Array.isArray(saved)) setCatalog([...builtInMethods, ...saved.filter((method) => method?.origin === "CUSTOM")]);
    } catch { localStorage.removeItem("biotrust.custom-methods.v1"); }
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem("biotrust.theme.v1");
    const next: Theme = saved === "dark" || saved === "light" ? saved : "dark";
    document.documentElement.dataset.theme = next;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the device-local display preference after mount
    setTheme(next);
  }, []);
  const toggleTheme = () => setTheme((current) => {
    const next = current === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("biotrust.theme.v1", next);
    return next;
  });
  const persistCustomMethods = (custom: MethodCard[]) => { localStorage.setItem("biotrust.custom-methods.v1", JSON.stringify(custom)); setCatalog([...builtInMethods, ...custom]); };
  const addMethod = (method: MethodCard) => { const custom = [...catalog.filter((item) => item.origin === "CUSTOM"), method]; persistCustomMethods(custom); setAddMethodOpen(false); setSelectedMethod(method); notify(`${method.name} added as REVIEW REQUIRED`); };
  const deleteMethod = (method: MethodCard) => { persistCustomMethods(catalog.filter((item) => item.origin === "CUSTOM" && item.slug !== method.slug)); setSelectedMethod(null); notify("Custom Method Card removed from this device"); };
  const exportMethodPack = () => { const blob = new Blob([JSON.stringify({ format: "biotrust-method-pack", version: 1, methods: catalog }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "biotrust-method-pack.json"; anchor.click(); URL.revokeObjectURL(url); notify("Method pack exported"); };
  const importMethodPack = async (file: File) => { try { const parsed = JSON.parse(await file.text()); const incoming = (Array.isArray(parsed) ? parsed : parsed.methods) as MethodCard[]; if (!Array.isArray(incoming)) throw new Error("Invalid pack"); const valid = incoming.filter((method) => method?.name && method?.package && method?.fn && method?.question).map((method, index) => ({ ...method, slug: `custom-imported-${Date.now()}-${index}`, status: "REVIEW_REQUIRED" as const, origin: "CUSTOM" as const })); const merged = [...catalog.filter((item) => item.origin === "CUSTOM"), ...valid]; persistCustomMethods(merged); notify(`${valid.length} Method Cards imported for review`); } catch { notify("Method pack could not be imported"); } };
  const audit = useMemo(() => ({ exported_at: new Date().toISOString(), project: "Synthetic melanoma TME study", privacy_mode: "NO_EXTERNAL_AI_MODE", dataset: { id: "SYN-MEL-20260825", seed: 20260825, synthetic: true }, researcher_plan: melanomaPlan, execution: syntheticResult, claims: syntheticResult ? claims : [], provenance: syntheticResult ? provenanceEvents : [] }), [melanomaPlan, syntheticResult]);
  const exportAudit = () => { if (!syntheticResult) { notify("Run the synthetic analysis before exporting an audit"); return; } const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "biotrust-audit-sanitized.json"; anchor.click(); URL.revokeObjectURL(url); notify("Sanitized audit export created"); };
  const updateMelanomaPlan = (next: MelanomaWorkflowPlan) => { setMelanomaPlan(next); setMelanomaOutput(null); setSyntheticResult(null); };
  const navigate = (next: View) => { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <main className="app-shell">
      <div className={mobileNav ? "mobile-nav open" : "mobile-nav"}><Sidebar active={view} hasResults={Boolean(syntheticResult)} theme={theme} onNavigate={navigate} onPrivacy={() => setPrivacyOpen(true)} onToggleTheme={toggleTheme} /><button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" /></div>
      <section className="workspace"><Topbar view={view} canExport={Boolean(syntheticResult)} onExport={exportAudit} onMenu={() => setMobileNav(true)} />
        {view === "example" && <MelanomaCaseStudyView plan={melanomaPlan} output={melanomaOutput} onPlanChange={updateMelanomaPlan} onOutput={setMelanomaOutput} onComplete={setSyntheticResult} onControlled={() => navigate("controlled")} onToast={notify} />}
        {view === "how" && <HowItWorksView navigate={navigate} openPrivacy={() => setPrivacyOpen(true)} hasResults={Boolean(syntheticResult)} />}
        {view === "overview" && <OverviewView navigate={navigate} openPrivacy={() => setPrivacyOpen(true)} hasResults={Boolean(syntheticResult)} />}
        {view === "projects" && <ProjectsView navigate={navigate} hasResults={Boolean(syntheticResult)} />}
        {view === "controlled" && <ExecutionView onToast={notify} />}
        {view === "trust" && (syntheticResult ? <TrustView selected={selectedClaim} setSelected={setSelectedClaim} onRules={() => setRulesOpen(true)} onToast={notify} /> : <ResultsGate navigate={navigate} destination="Result review" />)}
        {view === "claims" && (syntheticResult ? <ClaimsView selected={selectedClaim} setSelected={setSelectedClaim} /> : <ResultsGate navigate={navigate} destination="The claim ledger" />)}
        {view === "methods" && <MethodsView catalog={catalog} onSelect={setSelectedMethod} onAdd={() => setAddMethodOpen(true)} onImport={importMethodPack} onExport={exportMethodPack} />}
        {view === "provenance" && (syntheticResult ? <ProvenanceView onExport={exportAudit} /> : <ResultsGate navigate={navigate} destination="The provenance record" />)}
      </section>
      {privacyOpen && <Modal title="AI Context Inspector" onClose={() => setPrivacyOpen(false)} wide><div className="modal-body"><div className="policy-status"><span className="policy-lock">●</span><div><Badge>NO_EXTERNAL_AI_MODE</Badge><h3>No information can be sent to an external AI provider.</h3><p>The allowlist remains inspectable so a researcher can understand the boundary before ever enabling Standard Mode.</p></div></div><div className="context-columns"><section><header><span>✓</span><div><strong>Permitted context</strong><small>In Standard Mode, after approval</small></div></header>{contextAllowed.map((item) => <p key={item}><span>✓</span>{item}</p>)}</section><section className="blocked"><header><span>×</span><div><strong>Prohibited context</strong><small>Blocked before payload construction</small></div></header>{contextBlocked.map((item) => <p key={item}><span>×</span>{item}</p>)}</section></div><div className="payload-preview"><header><strong>Information being shared with AI</strong><Badge tone="gray">EMPTY PAYLOAD</Badge></header><code>{`{\n  "provider": null,\n  "mode": "NO_EXTERNAL_AI_MODE",\n  "payload": null,\n  "blocked_by_policy": true\n}`}</code></div></div><footer className="modal-footer"><span>Every attempted request creates a hash-only AIContextRecord.</span><button className="primary-button" onClick={() => setPrivacyOpen(false)}>Policy understood</button></footer></Modal>}
      {rulesOpen && <Modal title="Deterministic evidence rules" onClose={() => setRulesOpen(false)}><div className="modal-body rules-body"><p>BioTrust never invents a confidence percentage. Each dimension is computed from structured project metadata.</p>{[["0", "Missing or unresolved"], ["1", "Partial or limited"], ["2", "Satisfied and documented"], ["N/A", "Not required for this claim"]].map(([score, meaning]) => <div className="rule-row" key={score}><span>{score}</span><strong>{meaning}</strong></div>)}<div className="overall-rule"><strong>Overall state: SUPPORTED</strong><p>Requires complete provenance, an appropriate model with declared multiple testing, and no unresolved critical warning. External replication is not required until a claim is labeled externally replicated.</p></div></div></Modal>}
      {addMethodOpen && <AddMethodCardModal onClose={() => setAddMethodOpen(false)} onSave={addMethod} />}
      {selectedMethod && <Modal title={selectedMethod.name} onClose={() => setSelectedMethod(null)} wide><div className="modal-body method-detail"><div className="method-detail-hero"><div><span className="method-badges">{selectedMethod.origin === "CUSTOM" && <Badge tone="blue">CUSTOM</Badge>}<Badge tone={selectedMethod.status === "VERIFIED" ? "green" : "amber"}>{selectedMethod.status.replaceAll("_", " ")}</Badge></span><code>{selectedMethod.package}::{selectedMethod.fn}</code></div><p>{selectedMethod.question}</p></div>{selectedMethod.origin === "CUSTOM" && <div className="custom-method-warning"><span>!</span><p><strong>Researcher-provided Method Card</strong>This card is unverified and cannot become executable until a controlled adapter, tests, and curator approval are added.</p></div>}<div className="method-detail-grid"><section><h3>What does it not answer?</h3>{selectedMethod.notAnswered.map((item) => <p key={item}>× <span>{item}</span></p>)}</section><section><h3>Appropriate when</h3>{selectedMethod.appropriate.map((item) => <p key={item}>✓ <span>{item}</span></p>)}</section><section><h3>Assumptions</h3>{selectedMethod.assumptions.map((item) => <p key={item}>○ <span>{item}</span></p>)}</section><section><h3>Common failure modes</h3>{selectedMethod.failureModes.map((item) => <p key={item}>! <span>{item}</span></p>)}</section><section><h3>Alternatives</h3>{selectedMethod.alternatives.map((item) => <p key={item}>↔ <span>{item}</span></p>)}</section><section><h3>Recommended validation</h3>{selectedMethod.validation.map((item) => <p key={item}>✓ <span>{item}</span></p>)}</section></div>{selectedMethod.officialDocumentation && <a className="official-doc-link" href={selectedMethod.officialDocumentation} target="_blank" rel="noreferrer">Open official documentation <span>↗</span></a>}</div><footer className="modal-footer"><span>Method Cards describe methods; they are not evidence for a result.</span><div className="modal-actions">{selectedMethod.origin === "CUSTOM" && <button className="danger-button" onClick={() => deleteMethod(selectedMethod)}>Remove local card</button>}<button className="primary-button" onClick={() => setSelectedMethod(null)}>Close Method Card</button></div></footer></Modal>}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
