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

type View = "overview" | "projects" | "analysis" | "execution" | "trust" | "claims" | "methods" | "provenance";

type ExecutionResult = {
  execution_id: string;
  status: string;
  method: string;
  comparison: string;
  reference: string;
  design: string;
  sample_count: number;
  feature_count: number;
  retained_feature_count: number;
  input_hashes: Record<string, string>;
  output_hash: string;
  software_versions: Record<string, string>;
  warnings: string[];
  generated_at: string;
  results: Array<{ feature_id: string; log2_fold_change: number | null; statistic: number | null; p_value: number | null; adjusted_p_value: number | null }>;
};

const nav: Array<{ view: View; label: string; glyph: string; group?: string; count?: number }> = [
  { view: "overview", label: "Overview", glyph: "⌂", group: "Workspace" },
  { view: "projects", label: "Projects", glyph: "□" },
  { view: "analysis", label: "Analysis plans", glyph: "⌁" },
  { view: "execution", label: "Run analysis", glyph: "▶" },
  { view: "trust", label: "Can I trust this?", glyph: "◇", group: "Scientific record" },
  { view: "claims", label: "Claim ledger", glyph: "≡", count: 4 },
  { view: "methods", label: "Method library", glyph: "◫" },
  { view: "provenance", label: "Provenance", glyph: "⌘" },
];

const viewTitle: Record<View, string> = {
  overview: "Overview",
  projects: "Projects",
  analysis: "Analysis plan",
  execution: "Controlled execution",
  trust: "Result review",
  claims: "Claim ledger",
  methods: "Method library",
  provenance: "Provenance",
};

const recommendedWording =
  "Exposure_A and Clinical_Score are associated with a similar molecular state. The current analysis does not establish whether Exposure_A explains the Clinical_Score association.";

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

function Sidebar({ active, onNavigate, onPrivacy }: { active: View; onNavigate: (view: View) => void; onPrivacy: () => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate("overview")} aria-label="BioTrust AI home">
        <span className="brand-mark">B</span>
        <span>BioTrust <i>AI</i></span>
      </button>
      <nav aria-label="Primary navigation">
        {nav.map((item) => (
          <div key={item.view}>
            {item.group && <p className="nav-label">{item.group}</p>}
            <button className={`nav-item ${active === item.view ? "active" : ""}`} onClick={() => onNavigate(item.view)}>
              <span>{item.glyph}</span>{item.label}{item.count && <b>{item.count}</b>}
            </button>
          </div>
        ))}
      </nav>
      <button className="privacy-card" onClick={onPrivacy}>
        <span className="privacy-row"><span className="lock">●</span><strong>No external AI</strong></span>
        <span className="privacy-copy">Raw data stays inside the local computation boundary.</span>
        <span className="privacy-action">Inspect privacy boundary <span>→</span></span>
      </button>
      <div className="user-row"><span className="avatar">SR</span><div><strong>Synthetic researcher</strong><small>Local workspace</small></div><span>•••</span></div>
    </aside>
  );
}

function Topbar({ view, onExport, onMenu }: { view: View; onExport: () => void; onMenu: () => void }) {
  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMenu}>☰</button>
      <div className="breadcrumbs"><span>Synthetic transcriptomic association study</span><b>/</b><strong>{viewTitle[view]}</strong></div>
      <div className="top-actions"><button className="icon-btn" aria-label="Notifications">◎</button><button className="export-btn" onClick={onExport}>Export audit <span>↗</span></button></div>
    </header>
  );
}

function OverviewView({ navigate, openPrivacy }: { navigate: (view: View) => void; openPrivacy: () => void }) {
  const stats = [
    ["Registered datasets", "1", "Synthetic only", "□"],
    ["Analysis plans", "5", "4 completed", "⌁"],
    ["Scientific claims", "4", "1 needs review", "≡"],
    ["Provenance coverage", "100%", "All runs traceable", "⌘"],
  ];
  return (
    <div className="view overview-view">
      <section className="welcome-row">
        <div><span className="page-kicker">Research workspace</span><h1>Evidence before confidence.</h1><p>Trace every scientific decision from question to claim—without exposing raw research data to external AI.</p></div>
        <button className="primary-button" onClick={() => navigate("analysis")}>Create analysis plan <span>→</span></button>
      </section>
      <button className="mode-banner" onClick={openPrivacy}>
        <span className="mode-icon">●</span><span><strong>NO_EXTERNAL_AI_MODE is active</strong><small>All reasoning is deterministic and local. No payload can leave the computation boundary.</small></span><span className="mode-link">Inspect policy →</span>
      </button>
      <section className="stat-grid">
        {stats.map(([label, value, sub, glyph]) => <article className="stat-card" key={label}><span className="stat-glyph">{glyph}</span><small>{label}</small><strong>{value}</strong><p>{sub}</p></article>)}
      </section>
      <div className="overview-grid">
        <section className="panel workflow-panel">
          <div className="section-head"><div><span className="panel-icon">⌁</span><div><h2>Current analysis workflow</h2><p>Analysis 01 · Exposure_A association</p></div></div><Badge>RUN COMPLETE</Badge></div>
          <div className="workflow-track">
            {[
              ["1", "Question defined", "Researcher approved"],
              ["2", "Plan locked", "Formula confirmed"],
              ["3", "Analysis run", "Hashes recorded"],
              ["4", "Claims reviewed", "1 caveat attached"],
            ].map(([n, title, meta], index) => <div className="workflow-step" key={n}><span className="step-dot">{index < 3 ? "✓" : n}</span><div><strong>{title}</strong><small>{meta}</small></div>{index < 3 && <i />}</div>)}
          </div>
          <button className="text-button" onClick={() => navigate("trust")}>Review result evidence <span>→</span></button>
        </section>
        <section className="panel recent-panel">
          <div className="section-head"><div><span className="panel-icon">≡</span><div><h2>Recent claims</h2><p>Structured scientific statements</p></div></div><button className="quiet-button" onClick={() => navigate("claims")}>View all</button></div>
          <div className="mini-claims">
            {claims.slice(0, 3).map((claim) => <button key={claim.id} onClick={() => navigate("claims")}><span><Badge tone={claim.type === "HYPOTHESIS" ? "amber" : claim.type === "DATA" ? "blue" : "green"}>{claim.type}</Badge><small>{claim.id}</small></span><p>{claim.text}</p><i>›</i></button>)}
          </div>
        </section>
      </div>
      <section className="principle-strip"><span className="quote-mark">“</span><div><strong>Don’t trust the AI. Trust the evidence trail.</strong><p>AI can propose, explain, and critique. Structured analysis records and executed outputs remain authoritative.</p></div><button onClick={() => navigate("provenance")}>See the trail <span>→</span></button></section>
    </div>
  );
}

function ProjectsView({ navigate }: { navigate: (view: View) => void }) {
  return (
    <div className="view">
      <div className="page-head"><div><span className="page-kicker">Workspace</span><h1>Projects</h1><p>Local research workspaces with explicit privacy and provenance controls.</p></div><button className="primary-button" disabled title="Project creation is disabled in the synthetic demo">New project <span>＋</span></button></div>
      <section className="project-card">
        <div className="project-main"><div className="project-monogram">ST</div><div><span className="project-title-row"><h2>Synthetic transcriptomic association study</h2><Badge>SYNTHETIC</Badge></span><p>Demonstration workspace for auditable transcriptomic analysis. All values are procedurally generated.</p><div className="project-meta"><span>1 dataset</span><i>·</i><span>5 analyses</span><i>·</i><span>4 claims</span><i>·</i><span>Updated today</span></div></div></div>
        <div className="project-actions"><Badge tone="gray">LOCAL COMPUTE</Badge><button className="secondary-button" onClick={() => navigate("overview")}>Open project <span>→</span></button></div>
      </section>
      <div className="two-columns">
        <section className="panel dataset-panel"><div className="section-head"><div><span className="panel-icon">□</span><div><h2>Dataset registry</h2><p>Hash-addressed local inputs</p></div></div><Badge tone="green">VERIFIED</Badge></div><div className="dataset-row"><div className="dataset-file">CSV</div><div><strong>Synthetic_Cohort</strong><small>RNA-seq counts + sample metadata</small></div><div><span>120 samples</span><small>12,000 features</small></div><div><span>sha256</span><small>8fb2…d91c</small></div></div><div className="dataset-note"><span>✓</span><p><strong>Confidentiality-safe fixture</strong>Generated from random synthetic distributions with fixed seed 20250314.</p></div></section>
        <section className="panel boundary-mini"><div className="section-head"><div><span className="panel-icon">◉</span><div><h2>Data boundary</h2><p>Current project policy</p></div></div></div><div className="boundary-flow"><div><Badge tone="red">CONFIDENTIAL SIDE</Badge><strong>Raw inputs</strong><small>Local computation only</small></div><span>→</span><div><Badge>AI-SAFE SIDE</Badge><strong>Sanitized summaries</strong><small>Explicit allowlist only</small></div></div><p className="fine-print">The current mode blocks all external AI communication, including allowed summaries.</p></section>
      </div>
    </div>
  );
}

function AnalysisView({ onToast }: { onToast: (message: string) => void }) {
  const [exposure, setExposure] = useState("Exposure_A");
  const [outcome, setOutcome] = useState("Gene expression");
  const [covariates, setCovariates] = useState(["Age", "Sex", "Technical_Batch"]);
  const [robust, setRobust] = useState(true);
  const [standardize, setStandardize] = useState(true);
  const [proposal, setProposal] = useState<"PROPOSED" | "ACCEPTED" | "REJECTED">("PROPOSED");
  const [confirmed, setConfirmed] = useState(false);
  const formula = `~ ${exposure}${covariates.length ? ` + ${covariates.join(" + ")}` : ""}`;
  const toggleCovariate = (name: string) => setCovariates((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  return (
    <div className="view analysis-view">
      <div className="page-head"><div><span className="page-kicker">Structured planning</span><h1>New analysis</h1><p>Define the scientific question first. Every choice remains visible before execution.</p></div><Badge tone={confirmed ? "green" : "gray"}>{confirmed ? "PLAN CONFIRMED" : "DRAFT"}</Badge></div>
      <div className="analysis-layout">
        <section className="analysis-form">
          <div className="form-section"><span className="form-number">01</span><div className="form-body"><h2>Scientific question</h2><p>What association should this analysis evaluate?</p><label>Research question<textarea defaultValue="Which genes are associated with Exposure_A after adjustment for the pre-specified covariates?" /></label><div className="form-grid"><label>Exposure<select value={exposure} onChange={(event) => setExposure(event.target.value)}><option>Exposure_A</option><option>Clinical_Score</option><option>Continuous_Trait</option></select></label><label>Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option>Gene expression</option><option>Molecular score</option></select></label></div></div></div>
          <div className="form-section"><span className="form-number">02</span><div className="form-body"><h2>Population and covariates</h2><p>No covariate will be added or removed silently.</p><label>Sample population<input value="Tissue == Tissue_A" readOnly /></label><span className="field-label">Approved covariates</span><div className="check-grid">{["Age", "Sex", "Technical_Batch", "Clinical_Score"].map((name) => <label className="check-row" key={name}><input type="checkbox" checked={covariates.includes(name)} onChange={() => toggleCovariate(name)} /><span>{name}</span>{name === "Clinical_Score" && <small>Optional</small>}</label>)}</div></div></div>
          <div className="form-section"><span className="form-number">03</span><div className="form-body"><h2>Method configuration</h2><p>Method choices are linked to verified Method Cards.</p><div className="method-selection"><span className="method-logo">L</span><div><strong>limma-voom</strong><small>RNA-seq differential expression · verified method</small></div><Badge>SELECTED</Badge></div><div className="toggle-row"><div><strong>Standardize continuous exposure</strong><small>Scale using analysis-population mean and SD</small></div><button className={`toggle ${standardize ? "on" : ""}`} onClick={() => setStandardize(!standardize)} aria-label="Toggle standardization"><i /></button></div><div className="toggle-row"><div><strong>Robust empirical Bayes</strong><small>Use eBayes(robust = TRUE)</small></div><button className={`toggle ${robust ? "on" : ""}`} onClick={() => setRobust(!robust)} aria-label="Toggle robust empirical Bayes"><i /></button></div></div></div>
        </section>
        <aside className="plan-aside">
          <section className="panel exact-plan"><div className="section-head"><div><span className="panel-icon">⌁</span><div><h2>Exact analysis plan</h2><p>Authoritative structured preview</p></div></div></div><dl><div><dt>Dataset</dt><dd>Synthetic_Cohort</dd></div><div><dt>Population</dt><dd>Tissue == Tissue_A</dd></div><div><dt>Method</dt><dd>limma-voom</dd></div><div><dt>Formula</dt><dd><code>{formula}</code></dd></div><div><dt>Filtering</dt><dd>edgeR::filterByExpr</dd></div><div><dt>Normalization</dt><dd>TMM</dd></div><div><dt>Multiple testing</dt><dd>BH FDR · all retained genes</dd></div><div><dt>Options</dt><dd>{standardize ? "Standardized" : "Unscaled"} · robust {String(robust)}</dd></div></dl><div className="plan-warning"><span>!</span><p><strong>Confirmation required</strong>Execution is disabled until the researcher approves this exact plan.</p></div><button className="primary-button full" onClick={() => { setConfirmed(true); onToast("Analysis plan confirmed and locked"); }}>Confirm exact plan <span>✓</span></button></section>
          <section className="panel ai-proposal"><div className="section-head"><div><span className="panel-icon amber">AI</span><div><h2>AI proposal</h2><p>Mock provider · sanitized context</p></div></div><Badge tone={proposal === "ACCEPTED" ? "green" : proposal === "REJECTED" ? "red" : "amber"}>{proposal}</Badge></div><p>Consider Technical_Batch because it may explain technical variation in the count matrix.</p><div className="proposal-limit"><strong>What this does not establish</strong><span>That Technical_Batch is a biological confounder, or that adjustment is always appropriate.</span></div><div className="proposal-actions"><button onClick={() => { setProposal("REJECTED"); onToast("AI proposal rejected; original record retained"); }}>Reject</button><button onClick={() => onToast("Modify mode opened in the structured plan")}>Modify</button><button className="accept" onClick={() => { setProposal("ACCEPTED"); if (!covariates.includes("Technical_Batch")) setCovariates([...covariates, "Technical_Batch"]); onToast("AI proposal accepted; USER_CHOICE record created"); }}>Accept</button></div></section>
        </aside>
      </div>
    </div>
  );
}

function ExecutionView({ onToast }: { onToast: (message: string) => void }) {
  const [localRuntime, setLocalRuntime] = useState(false);
  const [countsFile, setCountsFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [method, setMethod] = useState("edger_qlf");
  const [conditionColumn, setConditionColumn] = useState("condition");
  const [referenceLevel, setReferenceLevel] = useState("control");
  const [comparisonLevel, setComparisonLevel] = useState("treated");
  const [covariates, setCovariates] = useState("batch");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local execution is enabled only after the browser host is known
    setLocalRuntime(["localhost", "127.0.0.1", "::1"].includes(window.location.hostname));
  }, []);
  const download = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const downloadResults = () => {
    if (!result) return;
    const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = result.results.map((row) => [row.feature_id, row.log2_fold_change, row.statistic, row.p_value, row.adjusted_p_value].map(escape).join(","));
    download(["feature_id,log2_fold_change,statistic,p_value,adjusted_p_value", ...rows].join("\n"), `${result.execution_id}-results.csv`, "text/csv");
    onToast("Result table downloaded");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!localRuntime || !countsFile || !metadataFile) return;
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
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const response = await fetch(`${apiBase}/api/executions/run`, { method: "POST", body: form });
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
  return (
    <div className="view execution-view">
      <div className="page-head"><div><span className="page-kicker">Local computation boundary</span><h1>Run a controlled analysis</h1><p>Execute a validated RNA-seq comparison without allowing arbitrary code or sending raw data to an external service.</p></div><Badge tone={localRuntime ? "green" : "gray"}>{localRuntime ? "LOCAL RUNNER" : "WEB PREVIEW"}</Badge></div>
      {!localRuntime && <section className="hosted-execution-notice"><span>⌂</span><div><strong>Private dataset execution is deliberately unavailable on the public website.</strong><p>Clone the repository and run <code>docker compose up --build</code>. Then open <code>http://localhost:3000</code>; this form will connect only to your local BioTrust API.</p></div><a href="https://github.com/Hasnat-HN/BioTrust-AI" target="_blank" rel="noreferrer">Open GitHub setup <span>↗</span></a></section>}
      <div className="execution-layout">
        <form className="panel execution-form" onSubmit={submit}>
          <div className="section-head"><div><span className="panel-icon">▶</span><div><h2>Analysis inputs</h2><p>Files remain inside the temporary local runner</p></div></div><Badge tone="blue">ALLOWLISTED</Badge></div>
          <div className="execution-files">
            <label><span>Count matrix CSV</span><input type="file" accept=".csv,text/csv" disabled={!localRuntime || running} onChange={(event) => setCountsFile(event.target.files?.[0] ?? null)} /><small>{countsFile?.name ?? "First column: feature_id; remaining columns: samples"}</small></label>
            <label><span>Sample metadata CSV</span><input type="file" accept=".csv,text/csv" disabled={!localRuntime || running} onChange={(event) => setMetadataFile(event.target.files?.[0] ?? null)} /><small>{metadataFile?.name ?? "Must include sample_id and the selected condition"}</small></label>
          </div>
          <div className="execution-fields">
            <label>Method<select value={method} disabled={!localRuntime || running} onChange={(event) => setMethod(event.target.value)}><option value="edger_qlf">edgeR quasi-likelihood</option><option value="deseq2_wald">DESeq2 Wald test</option></select></label>
            <label>Condition column<input value={conditionColumn} disabled={!localRuntime || running} onChange={(event) => setConditionColumn(event.target.value)} /></label>
            <label>Reference level<input value={referenceLevel} disabled={!localRuntime || running} onChange={(event) => setReferenceLevel(event.target.value)} /></label>
            <label>Comparison level<input value={comparisonLevel} disabled={!localRuntime || running} onChange={(event) => setComparisonLevel(event.target.value)} /></label>
          </div>
          <label className="execution-covariates">Covariates <small>Comma-separated metadata columns; leave empty for none</small><input value={covariates} disabled={!localRuntime || running} onChange={(event) => setCovariates(event.target.value)} placeholder="batch,sex" /></label>
          <div className="execution-contract"><span>✓</span><p><strong>Exact controlled request</strong><code>~ {covariates.split(",").map((item) => item.trim()).filter(Boolean).join(" + ")}{covariates.trim() ? " + " : ""}{conditionColumn}</code><small>{comparisonLevel} versus {referenceLevel} · BH-adjusted p-values · no arbitrary formulas</small></p></div>
          {error && <div className="execution-error" role="alert"><strong>Analysis not started</strong><span>{error}</span></div>}
          <button className="primary-button full" type="submit" disabled={!localRuntime || !countsFile || !metadataFile || running}>{running ? "Running inside the local boundary…" : "Confirm and run analysis"} <span>{running ? "◌" : "→"}</span></button>
        </form>
        <aside className="execution-aside">
          <section className="panel"><div className="section-head"><div><span className="panel-icon">◇</span><div><h2>Execution boundary</h2><p>What the adapter enforces</p></div></div></div><ul className="guard-list"><li><span>01</span><p><strong>Two fixed methods</strong>edgeR QL and DESeq2 Wald only</p></li><li><span>02</span><p><strong>Validated inputs</strong>Exact sample match and integer counts</p></li><li><span>03</span><p><strong>Temporary processing</strong>Uploads deleted after each request</p></li><li><span>04</span><p><strong>Auditable output</strong>Input, result, and software records</p></li></ul></section>
          <section className="panel input-limits"><h2>Default limits</h2><dl><div><dt>File size</dt><dd>50 MB each</dd></div><div><dt>Features</dt><dd>50,000</dd></div><div><dt>Samples</dt><dd>500</dd></div><div><dt>Runtime</dt><dd>15 minutes</dd></div><div><dt>Replication</dt><dd>≥ 2 per group</dd></div></dl></section>
        </aside>
      </div>
      {result && <section className="panel execution-results"><div className="result-head"><div><Badge>RUN COMPLETE</Badge><h2>{result.comparison} versus {result.reference}</h2><p>{result.execution_id} · {result.design}</p></div><div><button className="secondary-button" onClick={() => download(JSON.stringify(result, null, 2), `${result.execution_id}-audit.json`, "application/json")}>Audit JSON <span>↓</span></button><button className="primary-button" onClick={downloadResults}>Results CSV <span>↓</span></button></div></div><div className="run-facts"><span><small>Samples</small><strong>{result.sample_count}</strong></span><span><small>Input features</small><strong>{result.feature_count.toLocaleString()}</strong></span><span><small>Retained</small><strong>{result.retained_feature_count.toLocaleString()}</strong></span><span><small>Runtime</small><strong>{Object.entries(result.software_versions).map(([name, version]) => `${name} ${version}`).join(" · ")}</strong></span></div><div className="result-table-wrap"><table><thead><tr><th>Feature</th><th>log2 fold change</th><th>Statistic</th><th>p-value</th><th>Adjusted p-value</th></tr></thead><tbody>{result.results.slice(0, 100).map((row) => <tr key={row.feature_id}><td>{row.feature_id}</td><td>{formatNumber(row.log2_fold_change)}</td><td>{formatNumber(row.statistic)}</td><td>{formatNumber(row.p_value)}</td><td>{formatNumber(row.adjusted_p_value)}</td></tr>)}</tbody></table></div><div className="hash-record"><strong>Immutable run record</strong><code>counts {result.input_hashes.counts_sha256}</code><code>metadata {result.input_hashes.metadata_sha256}</code><code>output {result.output_hash}</code></div>{result.results.length > 100 && <p className="result-preview-note">Showing the first 100 adjusted-p-value-ranked features. The CSV download contains all {result.results.length.toLocaleString()} rows.</p>}</section>}
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
      <section className="trust-details-grid"><article><span>01</span><strong>What the data show</strong><p>Signed gene-level statistics and gene-set shifts were produced by executed code from the synthetic dataset.</p></article><article><span>02</span><strong>What the method does not show</strong><p>Neither limma-voom nor cameraPR establishes causality, mechanism, temporal progression, or cell abundance.</p></article><article><span>03</span><strong>What would strengthen this?</strong><p>Adjust the Clinical_Score model for Exposure_A, test sensitivity to batch, and reproduce the pattern in an independent dataset.</p></article></section>
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
        <aside className="panel claim-detail"><div className="section-head"><div><span className="panel-icon">≡</span><div><h2>{selected.id}</h2><p>Claim inspection</p></div></div><Badge tone={selected.type === "HYPOTHESIS" ? "amber" : selected.type === "DATA" ? "blue" : "green"}>{selected.type}</Badge></div><blockquote>“{selected.text}”</blockquote><div className="detail-block"><strong>Source</strong><p>{selected.source}</p></div><div className="detail-block caution"><strong>Interpretation warning</strong><p>{selected.warning}</p></div><div className="detail-block"><strong>Provenance path</strong><p>Claim → Result set 01 → cameraPR → Analysis plan AP-001 → Synthetic_Cohort</p></div><button className="secondary-button full">Open evidence view <span>→</span></button></aside>
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
        <section className="panel timeline-panel"><div className="run-summary"><div><Badge>RUN COMPLETE</Badge><h2>Analysis 01 · Exposure_A association</h2><p>Run ID ANR-20250314-001 · deterministic seed 20250314</p></div><div><small>Duration</small><strong>00:03:28</strong></div></div><div className="timeline">{provenanceEvents.map((event, index) => <article key={event.type}><span className="timeline-dot">{index === provenanceEvents.length - 1 ? "●" : "✓"}</span><time>{event.time}</time><div><Badge tone={event.type.includes("CLAIM") ? "amber" : event.type.includes("MODEL") ? "blue" : "gray"}>{event.type}</Badge><h3>{event.title}</h3><p>{event.detail}</p><small>{event.actor}</small></div></article>)}</div></section>
        <aside className="provenance-aside"><section className="panel hash-card"><div className="section-head"><div><span className="panel-icon">#</span><h2>Reproducibility record</h2></div><Badge>COMPLETE</Badge></div><dl><div><dt>Git commit</dt><dd><code>demo-a34f29c</code></dd></div><div><dt>Code hash</dt><dd><code>7d4a…ef82</code></dd></div><div><dt>Input hash</dt><dd><code>8fb2…d91c</code></dd></div><div><dt>Output hash</dt><dd><code>51ac…82b7</code></dd></div><div><dt>Python</dt><dd>3.12.x</dd></div><div><dt>R</dt><dd>4.4.x</dd></div><div><dt>Random seed</dt><dd>20250314</dd></div></dl></section><section className="panel source-chain"><h2>Trace selected claim</h2><div><span>Claim</span><strong>CLM-004</strong></div><i>↓</i><div><span>Result</span><strong>Gene-set comparison</strong></div><i>↓</i><div><span>Method</span><strong>cameraPR</strong></div><i>↓</i><div><span>Analysis</span><strong>ANR-001 + ANR-002</strong></div><i>↓</i><div><span>Dataset</span><strong>Synthetic_Cohort</strong></div></section></aside>
      </div>
    </div>
  );
}

export default function BioTrustApp() {
  const [view, setView] = useState<View>("trust");
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
  const persistCustomMethods = (custom: MethodCard[]) => { localStorage.setItem("biotrust.custom-methods.v1", JSON.stringify(custom)); setCatalog([...builtInMethods, ...custom]); };
  const addMethod = (method: MethodCard) => { const custom = [...catalog.filter((item) => item.origin === "CUSTOM"), method]; persistCustomMethods(custom); setAddMethodOpen(false); setSelectedMethod(method); notify(`${method.name} added as REVIEW REQUIRED`); };
  const deleteMethod = (method: MethodCard) => { persistCustomMethods(catalog.filter((item) => item.origin === "CUSTOM" && item.slug !== method.slug)); setSelectedMethod(null); notify("Custom Method Card removed from this device"); };
  const exportMethodPack = () => { const blob = new Blob([JSON.stringify({ format: "biotrust-method-pack", version: 1, methods: catalog }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "biotrust-method-pack.json"; anchor.click(); URL.revokeObjectURL(url); notify("Method pack exported"); };
  const importMethodPack = async (file: File) => { try { const parsed = JSON.parse(await file.text()); const incoming = (Array.isArray(parsed) ? parsed : parsed.methods) as MethodCard[]; if (!Array.isArray(incoming)) throw new Error("Invalid pack"); const valid = incoming.filter((method) => method?.name && method?.package && method?.fn && method?.question).map((method, index) => ({ ...method, slug: `custom-imported-${Date.now()}-${index}`, status: "REVIEW_REQUIRED" as const, origin: "CUSTOM" as const })); const merged = [...catalog.filter((item) => item.origin === "CUSTOM"), ...valid]; persistCustomMethods(merged); notify(`${valid.length} Method Cards imported for review`); } catch { notify("Method pack could not be imported"); } };
  const audit = useMemo(() => ({ exported_at: new Date().toISOString(), project: "Synthetic transcriptomic association study", privacy_mode: "NO_EXTERNAL_AI_MODE", dataset: { id: "Synthetic_Cohort", sha256: "8fb2…d91c", synthetic: true }, claims, provenance: provenanceEvents }), []);
  const exportAudit = () => { const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "biotrust-audit-sanitized.json"; anchor.click(); URL.revokeObjectURL(url); notify("Sanitized audit export created"); };
  const navigate = (next: View) => { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <main className="app-shell">
      <div className={mobileNav ? "mobile-nav open" : "mobile-nav"}><Sidebar active={view} onNavigate={navigate} onPrivacy={() => setPrivacyOpen(true)} /><button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" /></div>
      <section className="workspace"><Topbar view={view} onExport={exportAudit} onMenu={() => setMobileNav(true)} />
        {view === "overview" && <OverviewView navigate={navigate} openPrivacy={() => setPrivacyOpen(true)} />}
        {view === "projects" && <ProjectsView navigate={navigate} />}
        {view === "analysis" && <AnalysisView onToast={notify} />}
        {view === "execution" && <ExecutionView onToast={notify} />}
        {view === "trust" && <TrustView selected={selectedClaim} setSelected={setSelectedClaim} onRules={() => setRulesOpen(true)} onToast={notify} />}
        {view === "claims" && <ClaimsView selected={selectedClaim} setSelected={setSelectedClaim} />}
        {view === "methods" && <MethodsView catalog={catalog} onSelect={setSelectedMethod} onAdd={() => setAddMethodOpen(true)} onImport={importMethodPack} onExport={exportMethodPack} />}
        {view === "provenance" && <ProvenanceView onExport={exportAudit} />}
      </section>
      {privacyOpen && <Modal title="AI Context Inspector" onClose={() => setPrivacyOpen(false)} wide><div className="modal-body"><div className="policy-status"><span className="policy-lock">●</span><div><Badge>NO_EXTERNAL_AI_MODE</Badge><h3>No information can be sent to an external AI provider.</h3><p>The allowlist remains inspectable so a researcher can understand the boundary before ever enabling Standard Mode.</p></div></div><div className="context-columns"><section><header><span>✓</span><div><strong>Permitted context</strong><small>In Standard Mode, after approval</small></div></header>{contextAllowed.map((item) => <p key={item}><span>✓</span>{item}</p>)}</section><section className="blocked"><header><span>×</span><div><strong>Prohibited context</strong><small>Blocked before payload construction</small></div></header>{contextBlocked.map((item) => <p key={item}><span>×</span>{item}</p>)}</section></div><div className="payload-preview"><header><strong>Information being shared with AI</strong><Badge tone="gray">EMPTY PAYLOAD</Badge></header><code>{`{\n  "provider": null,\n  "mode": "NO_EXTERNAL_AI_MODE",\n  "payload": null,\n  "blocked_by_policy": true\n}`}</code></div></div><footer className="modal-footer"><span>Every attempted request creates a hash-only AIContextRecord.</span><button className="primary-button" onClick={() => setPrivacyOpen(false)}>Policy understood</button></footer></Modal>}
      {rulesOpen && <Modal title="Deterministic evidence rules" onClose={() => setRulesOpen(false)}><div className="modal-body rules-body"><p>BioTrust never invents a confidence percentage. Each dimension is computed from structured project metadata.</p>{[["0", "Missing or unresolved"], ["1", "Partial or limited"], ["2", "Satisfied and documented"], ["N/A", "Not required for this claim"]].map(([score, meaning]) => <div className="rule-row" key={score}><span>{score}</span><strong>{meaning}</strong></div>)}<div className="overall-rule"><strong>Overall state: SUPPORTED</strong><p>Requires complete provenance, an appropriate model with declared multiple testing, and no unresolved critical warning. External replication is not required until a claim is labeled externally replicated.</p></div></div></Modal>}
      {addMethodOpen && <AddMethodCardModal onClose={() => setAddMethodOpen(false)} onSave={addMethod} />}
      {selectedMethod && <Modal title={selectedMethod.name} onClose={() => setSelectedMethod(null)} wide><div className="modal-body method-detail"><div className="method-detail-hero"><div><span className="method-badges">{selectedMethod.origin === "CUSTOM" && <Badge tone="blue">CUSTOM</Badge>}<Badge tone={selectedMethod.status === "VERIFIED" ? "green" : "amber"}>{selectedMethod.status.replaceAll("_", " ")}</Badge></span><code>{selectedMethod.package}::{selectedMethod.fn}</code></div><p>{selectedMethod.question}</p></div>{selectedMethod.origin === "CUSTOM" && <div className="custom-method-warning"><span>!</span><p><strong>Researcher-provided Method Card</strong>This card is unverified and cannot become executable until a controlled adapter, tests, and curator approval are added.</p></div>}<div className="method-detail-grid"><section><h3>What does it not answer?</h3>{selectedMethod.notAnswered.map((item) => <p key={item}>× <span>{item}</span></p>)}</section><section><h3>Appropriate when</h3>{selectedMethod.appropriate.map((item) => <p key={item}>✓ <span>{item}</span></p>)}</section><section><h3>Assumptions</h3>{selectedMethod.assumptions.map((item) => <p key={item}>○ <span>{item}</span></p>)}</section><section><h3>Common failure modes</h3>{selectedMethod.failureModes.map((item) => <p key={item}>! <span>{item}</span></p>)}</section><section><h3>Alternatives</h3>{selectedMethod.alternatives.map((item) => <p key={item}>↔ <span>{item}</span></p>)}</section><section><h3>Recommended validation</h3>{selectedMethod.validation.map((item) => <p key={item}>✓ <span>{item}</span></p>)}</section></div>{selectedMethod.officialDocumentation && <a className="official-doc-link" href={selectedMethod.officialDocumentation} target="_blank" rel="noreferrer">Open official documentation <span>↗</span></a>}</div><footer className="modal-footer"><span>Method Cards describe methods; they are not evidence for a result.</span><div className="modal-actions">{selectedMethod.origin === "CUSTOM" && <button className="danger-button" onClick={() => deleteMethod(selectedMethod)}>Remove local card</button>}<button className="primary-button" onClick={() => setSelectedMethod(null)}>Close Method Card</button></div></footer></Modal>}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
