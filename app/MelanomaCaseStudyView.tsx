"use client";

import { useMemo, useState } from "react";
import type { ReportExecutionResult } from "./decisionTrail";
import {
  MELANOMA_DEMO_SEED,
  generateSyntheticMelanomaDataset,
  melanomaCountsCsv,
  melanomaMetadataCsv,
  runSyntheticMelanomaAnalysis,
  type MelanomaAnalysisResult,
  type MelanomaDataset,
} from "./melanomaDemo";
import {
  browserDgeMethods,
  buildComparisonSynthesis,
  dgeComparisonCsv,
  exploreMelanomaDataset,
  runDgeMethodComparison,
  runNeuralIntegration,
  type BrowserDgeMethodId,
  type DatasetExploration,
  type DgeMethodComparison,
  type DgeMethodRun,
  type NeuralIntegrationResult,
} from "./melanomaMethods";
import {
  buildPlanGuidance,
  defaultMelanomaPlan,
  melanomaAnalysisModules,
  validateMelanomaPlan,
  type MelanomaAnalysisModuleId,
  type MelanomaWorkflowPlan,
} from "./melanomaWorkflow";
import { runWebRAnalysis, webRMethods, webRResultsCsv, type WebRExecutionResult, type WebRMethodId, type WebRMethodRun } from "./webRAnalysis";

export type MelanomaWorkflowOutput = {
  dataset: MelanomaDataset;
  exploration: DatasetExploration;
  result: MelanomaAnalysisResult;
  comparison?: DgeMethodComparison;
  r_execution?: WebRExecutionResult;
  neural?: NeuralIntegrationResult;
  plan: MelanomaWorkflowPlan;
};

const format = (value: number, digits = 2) => value.toFixed(digits);
const formatP = (value: number) => value < 0.001 ? value.toExponential(2) : value.toFixed(3);
const compact = (value: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function downloadText(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BarList({ rows, total }: { rows: Array<{ label: string; count: number }>; total: number }) {
  return <div className="explore-bar-list">{rows.map((row) => <div key={row.label}><span><strong>{row.label}</strong><b>{row.count}</b></span><i><em style={{ width: `${100 * row.count / total}%` }} /></i></div>)}</div>;
}

function DatasetExplorer({ exploration, compactView = false }: { exploration: DatasetExploration; compactView?: boolean }) {
  const histogramMaximum = Math.max(...exploration.library_size.histogram.map((bin) => bin.count));
  return <section className={`dataset-explorer ${compactView ? "compact" : ""}`}>
    <header className="lab-section-head"><div><span>DATASET PROFILE</span><h2>Know the matrix before choosing an analysis.</h2><p>This pass is descriptive only. No response association is tested here.</p></div><span className="explore-complete">PROFILE COMPLETE</span></header>
    <div className="data-metrics"><article><span>Data type</span><strong>Bulk RNA-seq counts</strong><small>non-negative integers</small></article><article><span>Samples</span><strong>{exploration.matrix.samples}</strong><small>{exploration.groups.responder} responder · {exploration.groups.non_responder} non-responder</small></article><article><span>Features</span><strong>{exploration.matrix.features.toLocaleString()}</strong><small>generic synthetic IDs</small></article><article><span>Matrix cells</span><strong>{compact(exploration.matrix.cells)}</strong><small>{(100 * exploration.matrix.zero_rate).toFixed(1)}% zeros</small></article></div>
    <div className="exploration-grid">
      <section className="explore-chart"><header><div><span>LIBRARY SIZE DISTRIBUTION</span><h3>Counts per sample</h3></div><small>log10 scale</small></header><div className="histogram" aria-label="Library size histogram">{exploration.library_size.histogram.map((bin, index) => <div key={`${bin.label}-${index}`}><i style={{ height: `${Math.max(5, 100 * bin.count / histogramMaximum)}%` }} /><span>{bin.label.split("-")[0]}</span></div>)}</div><footer><span>Min {compact(exploration.library_size.minimum)}</span><span>Median {compact(exploration.library_size.median)}</span><span>Max {compact(exploration.library_size.maximum)}</span></footer></section>
      <section className="explore-chart composition"><header><div><span>TUMOR PURITY</span><h3>Admixture structure</h3></div><small>synthetic fraction</small></header><BarList rows={exploration.purity_bins} total={exploration.matrix.samples} /></section>
      <section className="explore-chart composition"><header><div><span>TECHNICAL DESIGN</span><h3>Sequencing batches</h3></div><small>3 levels</small></header><BarList rows={exploration.batch_counts} total={exploration.matrix.samples} /></section>
      <section className="explore-chart composition"><header><div><span>CLINICAL COMPOSITION</span><h3>Stage and biopsy site</h3></div><small>model covariates</small></header><BarList rows={[...exploration.stage_counts, ...exploration.site_counts]} total={exploration.matrix.samples} /></section>
    </div>
    {!compactView && <div className="suitability-checks"><header><span>METHOD SUITABILITY CHECK</span><h3>What the data structure allows—and what it requires.</h3></header>{exploration.checks.map((check) => <article key={check.label}><b className={check.status.toLowerCase()}>{check.status}</b><div><strong>{check.label}</strong><p>{check.detail}</p></div></article>)}</div>}
  </section>;
}

function MethodResultTable({ run }: { run: DgeMethodRun }) {
  return <div className="table-scroll"><table className="comparison-result-table"><thead><tr><th>Feature</th><th>Program</th><th>Effect</th><th>Statistic</th><th>p-value</th><th>BH FDR</th></tr></thead><tbody>{run.results.slice(0, 12).map((row) => <tr key={row.feature_id}><th>{row.feature_id}</th><td>{row.program}</td><td>{row.response_effect > 0 ? "+" : ""}{format(row.response_effect, 3)}</td><td>{format(row.statistic)}</td><td>{formatP(row.p_value)}</td><td>{formatP(row.adjusted_p_value)}</td></tr>)}</tbody></table></div>;
}

function RMethodResultTable({ run }: { run: WebRMethodRun }) {
  return <div className="table-scroll"><table className="comparison-result-table"><thead><tr><th>Feature</th><th>Program</th><th>Effect</th><th>R statistic</th><th>p-value</th><th>BH FDR</th></tr></thead><tbody>{run.results.slice(0, 12).map((row) => <tr key={row.feature_id}><th>{row.feature_id}</th><td>{row.program}</td><td>{row.response_effect > 0 ? "+" : ""}{format(row.response_effect, 3)}</td><td>{format(row.statistic)}</td><td>{formatP(row.p_value)}</td><td>{formatP(row.adjusted_p_value)}</td></tr>)}</tbody></table></div>;
}

function toExecutionResult(output: MelanomaWorkflowOutput): ReportExecutionResult {
  const recommendedRun = output.comparison?.runs.find((run) => run.method.id === output.comparison?.recommendation.method_id) ?? output.comparison?.runs[0];
  const recommendedRRun = output.r_execution?.methods.find((run) => run.method.id === "r_adjusted_lm") ?? output.r_execution?.methods[0];
  const rows = recommendedRun?.results ?? recommendedRRun?.results ?? [];
  return {
    execution_id: output.result.execution_id,
    status: "completed",
    method: [output.comparison?.runs.map((run) => run.method.short_name).join(" + "), output.r_execution?.methods.map((run) => run.method.short_name).join(" + ")].filter(Boolean).join(" + ") || output.plan.analyses.join(" + "),
    comparison: "Synthetic responder",
    reference: "Synthetic non-responder",
    design: "~ response + age + recorded sex + stage + biopsy site + prior therapy + tumor purity + batch",
    sample_count: output.result.dataset.sample_count,
    feature_count: output.result.dataset.feature_count,
    retained_feature_count: output.result.dataset.feature_count,
    input_hashes: { metadata: output.result.hashes.metadata, counts: output.result.hashes.counts },
    output_hash: output.result.hashes.results,
    software_versions: { browser: "deterministic TypeScript engine", r: output.r_execution ? `${output.r_execution.r_version}; stats ${output.r_execution.package_versions.stats}` : "not selected", neural: output.neural ? output.neural.architecture : "not selected" },
    warnings: output.result.warnings,
    generated_at: new Date().toISOString(),
    results: rows.map((row) => ({ feature_id: row.feature_id, log2_fold_change: row.response_effect, statistic: row.statistic, p_value: row.p_value, adjusted_p_value: row.adjusted_p_value })),
  };
}

export default function MelanomaCaseStudyView({ plan, output, onPlanChange, onOutput, onComplete, onControlled, onToast }: { plan: MelanomaWorkflowPlan; output: MelanomaWorkflowOutput | null; onPlanChange: (plan: MelanomaWorkflowPlan) => void; onOutput: (output: MelanomaWorkflowOutput | null) => void; onComplete: (result: ReportExecutionResult) => void; onControlled: () => void; onToast: (message: string) => void }) {
  const dataset = useMemo(() => generateSyntheticMelanomaDataset(), []);
  const [loadState, setLoadState] = useState<"ready" | "loading" | "explored">(() => output ? "explored" : "ready");
  const [exploration, setExploration] = useState<DatasetExploration | null>(() => output?.exploration ?? null);
  const scrollTo = (id: "example-exploration" | "example-plan" | "example-run") => window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  const loadExample = async () => {
    if (loadState === "loading") return;
    setLoadState("loading");
    setExploration(null);
    onOutput(null);
    onPlanChange({ ...defaultMelanomaPlan, analyses: [], dge_methods: [], r_methods: [] });
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    setExploration(exploreMelanomaDataset(dataset));
    setLoadState("explored");
    onToast("Built-in example loaded and exploratory analysis completed");
    scrollTo("example-exploration");
  };
  return <div className="view melanoma-lab-view example-page">
    <header className="case-header"><div className="case-id"><span>ONE WORKED EXAMPLE</span><strong>EX-MEL-01</strong><i>SYNTHETIC · SEED {MELANOMA_DEMO_SEED}</i></div><span className={`case-decision ${output || loadState === "explored" ? "complete" : "pending"}`}>{output ? "ANALYSIS COMPLETE" : loadState === "explored" ? "EXPLORATION COMPLETE" : "DATA NOT LOADED"}</span></header>
    <section className="example-hero"><div><span className="page-kicker">Example</span><h1>Load the built-in study, inspect it, then choose what runs.</h1><p>The two demonstration files are already on the platform. Load them together, let BioTrust perform the descriptive exploration automatically, then select any JavaScript or R methods and optional analyses.</p><div><button className="primary-button" disabled={loadState === "loading"} onClick={loadExample}>{loadState === "loading" ? "Loading and exploring…" : loadState === "explored" ? "Reload example from the start" : "Load built-in example data"} <span>{loadState === "explored" ? "↻" : "↓"}</span></button></div></div><aside><span>SYNTHETIC MELANOMA STUDY</span><blockquote>Which baseline expression features and tumor-microenvironment programs are associated with synthetic PD-1 response after accounting for clinical and technical covariates?</blockquote><dl><div><dt>Population</dt><dd>180 baseline tumors</dd></div><div><dt>Outcome</dt><dd>Synthetic response</dd></div><div><dt>Data</dt><dd>Bulk RNA-seq counts</dd></div><div><dt>Covariates</dt><dd>7 declared</dd></div></dl></aside></section>
    <section className={`example-file-loader ${loadState}`} aria-live="polite">
      <header><div><span>STEP 1 · BUILT-IN FILES</span><h2>The Example already includes both required files.</h2><p>No upload is needed. Loading resets the Example and starts the descriptive exploration automatically.</p></div><strong>{loadState === "loading" ? "EXPLORING" : loadState === "explored" ? "READY" : "WAITING TO LOAD"}</strong></header>
      <div className="example-file-grid"><article><b>COUNTS</b><div><strong>synthetic-melanoma-counts.csv</strong><p>1,200 feature rows × 180 sample columns</p></div><span>CSV</span></article><article><b>METADATA</b><div><strong>synthetic-melanoma-metadata.csv</strong><p>180 samples × response and 7 declared covariates</p></div><span>CSV</span></article></div>
      <footer><button className="primary-button" disabled={loadState === "loading"} onClick={loadExample}>{loadState === "loading" ? "Running automatic exploration…" : loadState === "explored" ? "Load again and reset choices" : "Load both files and explore"}<span>{loadState === "loading" ? "…" : "→"}</span></button><p>{loadState === "loading" ? "Checking dimensions, counts, library sizes, groups, and covariates." : loadState === "explored" ? "Exploration is complete. No association method has run yet." : "This loads only the synthetic demonstration files already bundled with the platform."}</p></footer>
    </section>
    {exploration && <section id="example-exploration" className="example-workflow-anchor example-exploration-stage"><div className="example-stage-intro"><span>STEP 2 · AUTOMATIC EXPLORATION</span><h2>BioTrust inspected the loaded study before offering methods.</h2><p>The profile below is descriptive. It establishes what the data contain and which assumptions matter; it does not test the response question.</p></div><DatasetExplorer exploration={exploration} compactView /><div className="example-next-action"><div><span>EXPLORATION COMPLETE</span><h3>Now decide what scientific analysis should run.</h3><p>Every available method is visible in the next step. A method click directly adds or removes that analysis.</p></div><button className="primary-button" onClick={() => scrollTo("example-plan")}>Choose analyses and methods <span>↓</span></button></div></section>}
    {exploration && <section id="example-plan" className="example-workflow-anchor"><MelanomaAnalysisPlanView plan={plan} onPlanChange={onPlanChange} onRun={() => scrollTo("example-run")} onControlled={onControlled} onToast={onToast} /></section>}
    {exploration && plan.confirmed && <section id="example-run" className="example-workflow-anchor"><MelanomaExecutionView plan={plan} output={output} onOutput={onOutput} onComplete={onComplete} onEditPlan={() => scrollTo("example-plan")} onControlled={onControlled} onToast={onToast} /></section>}
  </div>;
}

export function MelanomaAnalysisPlanView({ plan, onPlanChange, onRun, onControlled, onToast }: { plan: MelanomaWorkflowPlan; onPlanChange: (plan: MelanomaWorkflowPlan) => void; onRun: () => void; onControlled: () => void; onToast: (message: string) => void }) {
  const guidance = buildPlanGuidance(plan);
  const issues = validateMelanomaPlan(plan);
  const update = (patch: Partial<MelanomaWorkflowPlan>) => onPlanChange({ ...plan, ...patch, confirmed: false });
  const setAnalysisState = (id: MelanomaAnalysisModuleId, selected: boolean) => selected
    ? (plan.analyses.includes(id) ? plan.analyses : [...plan.analyses, id])
    : plan.analyses.filter((item) => item !== id);
  const toggleAnalysis = (id: MelanomaAnalysisModuleId) => update({ analyses: setAnalysisState(id, !plan.analyses.includes(id)) });
  const toggleMethod = (id: BrowserDgeMethodId) => {
    const dgeMethods = plan.dge_methods.includes(id) ? plan.dge_methods.filter((item) => item !== id) : [...plan.dge_methods, id];
    update({ dge_methods: dgeMethods, analyses: setAnalysisState("dge", dgeMethods.length > 0) });
  };
  const toggleRMethod = (id: WebRMethodId) => {
    const rMethods = plan.r_methods.includes(id) ? plan.r_methods.filter((item) => item !== id) : [...plan.r_methods, id];
    update({ r_methods: rMethods, analyses: setAnalysisState("r_dge", rMethods.length > 0) });
  };
  const confirm = () => {
    if (issues.length) return onToast(issues[0]);
    onPlanChange({ ...plan, confirmed: true });
    onToast("Your Example plan is confirmed");
    window.setTimeout(onRun, 60);
  };
  return <div className="view melanoma-lab-view analysis-planner-view">
    <div className="page-head"><div><span className="page-kicker">Step 3 · choose the analysis</span><h1>Choose exactly what will run.</h1><p>All available choices are visible below. Clicking a JavaScript or R method directly adds that analysis—there is no separate parent card to unlock first.</p></div><span className={`planner-status ${plan.confirmed ? "confirmed" : "draft"}`}>{plan.confirmed ? "PLAN CONFIRMED" : "MAKE YOUR CHOICES"}</span></div>
    <div className="planner-layout">
      <main>
        <section className="planner-section question-builder"><header><span>01 · RESEARCH QUESTION</span><h2>What are you trying to learn?</h2></header><textarea value={plan.research_question} onChange={(event) => update({ research_question: event.target.value })} aria-label="Research question" /><div className="covariate-strip"><strong>Declared adjustment set</strong>{["Age", "Recorded sex", "Stage", "Biopsy site", "Prior therapy", "Tumor purity", "Batch"].map((item) => <span key={item}>{item}</span>)}</div></section>
        <section className="planner-section analysis-choice-hub"><header><span>02 · CHOOSE ANALYSIS AND METHODS</span><h2>Select one option—or combine several.</h2><p>Every method card is active now. A green border and checkmark mean it will run; click the card again to remove it.</p></header>
          <section className="analysis-family dge-method-builder"><header><div><span>A · JAVASCRIPT FEATURE-LEVEL ANALYSIS</span><h3>Choose one or more browser methods.</h3><p>Each method receives the same loaded samples and feature matrix. Two or more browser methods also produce a direct agreement comparison.</p></div><strong>{plan.dge_methods.length} SELECTED</strong></header><div className="method-choice-grid">{browserDgeMethods.map((method) => { const selected = plan.dge_methods.includes(method.id); return <button key={method.id} className={selected ? "selected" : ""} onClick={() => toggleMethod(method.id)} aria-pressed={selected}><span className="method-check">{selected ? "✓" : "+"}</span><span className="method-role">{method.role}</span><h3>{method.name}</h3><p>{method.answers}</p><dl><div><dt>Covariate adjustment</dt><dd>{method.adjusts_covariates ? "YES" : "NO"}</dd></div><div><dt>Browser executable</dt><dd>YES</dd></div></dl><small>{method.limitation}</small></button>; })}</div>{plan.dge_methods.length >= 2 && <div className="comparison-activated"><span>↔</span><p><strong>Browser method comparison activated</strong>BioTrust will calculate effect-rank correlation, sign agreement, top-50 overlap, FDR overlap, consensus features, and a question-matched recommendation.</p></div>}</section>
          <section className="analysis-family dge-method-builder r-method-builder"><header><div><span>B · GENUINE R FEATURE-LEVEL ANALYSIS</span><h3>Choose any R methods you want to run.</h3><p>These cards are independently selectable. Selecting one starts the R analysis only after you confirm the plan and press Run.</p></div><strong>{plan.r_methods.length} SELECTED</strong></header><div className="method-choice-grid">{webRMethods.map((method) => { const selected = plan.r_methods.includes(method.id); return <button key={method.id} className={selected ? "selected" : ""} onClick={() => toggleRMethod(method.id)} aria-pressed={selected}><span className="method-check">{selected ? "✓" : "+"}</span><span className="method-role">{method.role}</span><h3>{method.name}</h3><code>R {method.package_name}::{method.function_name}</code><p>{method.answers}</p><dl><div><dt>Covariate adjustment</dt><dd>{method.adjusts_covariates ? "YES" : "NO"}</dd></div><div><dt>Execution</dt><dd>REAL R · LOCAL</dd></div></dl><small>{method.limitation}</small></button>; })}</div><div className="r-runtime-note"><span>R</span><p><strong>Actual R, not a JavaScript relabel</strong>The synthetic count matrix is copied into R&apos;s in-browser filesystem and processed locally. edgeR and DESeq2 still require compatible WebAssembly package builds or the controlled R service.</p></div></section>
          <section className="analysis-family additional-analysis-family"><header><div><span>C · OPTIONAL SUPPORTING ANALYSES</span><h3>Add biological summaries, sensitivity, or prediction.</h3><p>These choices answer different questions and remain separate in the report.</p></div><strong>{plan.analyses.filter((id) => id === "programs" || id === "purity" || id === "neural").length} SELECTED</strong></header><div className="analysis-module-grid">{melanomaAnalysisModules.filter((module) => module.id === "programs" || module.id === "purity" || module.id === "neural").map((module) => { const selected = plan.analyses.includes(module.id); return <button key={module.id} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => toggleAnalysis(module.id)}><b>{selected ? "✓" : "+"}</b><span>{module.method}</span><h3>{module.title}</h3><p>{module.question}</p><dl><div><dt>Output</dt><dd>{module.output}</dd></div><div><dt>Boundary</dt><dd>{module.boundary}</dd></div></dl></button>; })}</div></section>
        </section>
        {plan.analyses.includes("purity") && <section className="planner-section sensitivity-control"><header><span>03 · SENSITIVITY SETTING</span><h2>Choose the tumor-purity restriction.</h2></header><label>Minimum synthetic tumor purity<select value={plan.purity_threshold} onChange={(event) => update({ purity_threshold: Number(event.target.value) })}><option value={0.45}>≥ 0.45</option><option value={0.5}>≥ 0.50</option><option value={0.6}>≥ 0.60</option></select></label><p>This changes only the selected purity-sensitivity analysis; it does not silently remove samples from the other modules.</p></section>}
        <section className="production-methods"><div><span>COUNT-NATIVE R / BIOCONDUCTOR</span><h3>edgeR and DESeq2 require the controlled R runtime.</h3><p>The Example can now execute R&apos;s stats package locally through webR. It still will not pretend that a transformed-count browser model is edgeR or DESeq2.</p></div><div><span>edgeR QL</span><span>DESeq2 Wald</span><button onClick={onControlled}>Open controlled R runner →</button></div></section>
      </main>
      <aside className="ai-plan-guide">
        <header><span>AI METHOD GUIDE · LOCAL RULES</span><h2>Advice updates with your choices.</h2><p>The guide reads only the declared question and synthetic dataset structure. You retain the final decision.</p></header>
        <div>{guidance.map((item) => <article className={item.tone} key={`${item.title}-${item.detail}`}><b>{item.tone === "ready" ? "✓" : item.tone === "block" ? "×" : item.tone === "consider" ? "!" : "i"}</b><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div>
        <section className="plan-receipt"><span>YOUR CURRENT PLAN</span><dl><div><dt>Analyses</dt><dd>{plan.analyses.length}</dd></div><div><dt>Browser DGE</dt><dd>{plan.analyses.includes("dge") ? plan.dge_methods.length : "Not selected"}</dd></div><div><dt>R methods</dt><dd>{plan.analyses.includes("r_dge") ? plan.r_methods.length : "Not selected"}</dd></div><div><dt>Comparison</dt><dd>{plan.dge_methods.length >= 2 && plan.analyses.includes("dge") ? "Yes" : "No"}</dd></div><div><dt>Neural model</dt><dd>{plan.analyses.includes("neural") ? "Selected" : "Not selected"}</dd></div></dl></section>
        {issues.length > 0 && <div className="planner-issues">{issues.map((issue) => <p key={issue}>× {issue}</p>)}</div>}
        <button className="primary-button full" disabled={issues.length > 0} onClick={confirm}>Confirm selections and unlock Run <span>↓</span></button>
        <small>Changing any choice after confirmation creates a new draft and requires confirmation again.</small>
      </aside>
    </div>
  </div>;
}

export function MelanomaExecutionView({ plan, output, onOutput, onComplete, onEditPlan, onControlled, onToast }: { plan: MelanomaWorkflowPlan; output: MelanomaWorkflowOutput | null; onOutput: (output: MelanomaWorkflowOutput | null) => void; onComplete: (result: ReportExecutionResult) => void; onEditPlan: () => void; onControlled: () => void; onToast: (message: string) => void }) {
  const [running, setRunning] = useState(false);
  const [runStep, setRunStep] = useState("");
  const [activeMethod, setActiveMethod] = useState<BrowserDgeMethodId>(plan.dge_methods[0] ?? "adjusted_ols");
  const [activeRMethod, setActiveRMethod] = useState<WebRMethodId>(plan.r_methods[0] ?? "r_adjusted_lm");
  const activeRun = output?.comparison?.runs.find((run) => run.method.id === activeMethod) ?? output?.comparison?.runs[0];
  const activeRRun = output?.r_execution?.methods.find((run) => run.method.id === activeRMethod) ?? output?.r_execution?.methods[0];
  const interpretation = output?.comparison ? buildComparisonSynthesis(output.comparison, output.neural) : null;
  const run = async () => {
    if (!plan.confirmed) return onToast("Confirm the plan before running it");
    setRunning(true);
    setRunStep("Creating the deterministic synthetic cohort");
    onOutput(null);
    try {
      const base = runSyntheticMelanomaAnalysis(MELANOMA_DEMO_SEED, plan.purity_threshold);
      const rExecution = plan.analyses.includes("r_dge")
        ? await runWebRAnalysis(base.dataset, plan.r_methods, setRunStep)
        : undefined;
      const next: MelanomaWorkflowOutput = {
        ...base,
        exploration: exploreMelanomaDataset(base.dataset),
        comparison: plan.analyses.includes("dge") ? runDgeMethodComparison(base.dataset, base.result, plan.dge_methods) : undefined,
        r_execution: rExecution,
        neural: plan.analyses.includes("neural") ? runNeuralIntegration(base.dataset) : undefined,
        plan,
      };
      onOutput(next);
      if (next.comparison) setActiveMethod(next.comparison.recommendation.method_id);
      if (next.r_execution) setActiveRMethod(next.r_execution.methods[0].method.id);
      onComplete(toExecutionResult(next));
      onToast(`${plan.analyses.length} selected analysis module${plan.analyses.length === 1 ? "" : "s"} completed`);
    } catch (error) {
      onToast(error instanceof Error ? `Analysis stopped: ${error.message}` : "Analysis stopped before completion");
    } finally {
      setRunning(false);
      setRunStep("");
    }
  };
  const audit = output ? {
    format: "biotrust-melanoma-researcher-plan",
    version: 3,
    synthetic: true,
    seed: MELANOMA_DEMO_SEED,
    researcher_plan: output.plan,
    dataset_exploration: output.exploration,
    statistical_execution: output.result,
    method_comparison: output.comparison,
    r_package_execution: output.r_execution,
    neural_integration: output.neural,
    evidence_synthesis: interpretation,
  } : null;
  const downloadPdf = async () => {
    if (!output) return;
    const { downloadMelanomaReport } = await import("./melanomaReport");
    downloadMelanomaReport(output.result, { plan: output.plan, comparison: output.comparison, neural: output.neural, rExecution: output.r_execution });
  };
  if (!plan.confirmed) return <div className="view"><section className="results-gate"><span className="results-gate-mark">⌁</span><span className="page-kicker">Plan required</span><h1>Choose your analyses before running the melanoma example.</h1><p>The Example executes the exact plan confirmed by the researcher. It does not use a separate preconfigured case.</p><button className="primary-button" onClick={onEditPlan}>Open the Example plan <span>→</span></button></section></div>;
  return <div className="view melanoma-lab-view execution-workflow-view">
    <header className="execution-plan-header"><div><span>STEP 4 · CONFIRMED EXAMPLE PLAN</span><h1>Run the analysis you selected.</h1><p>{plan.research_question}</p></div><button onClick={onEditPlan}>Change selections</button></header>
    <section className="execution-receipt"><div><span>ANALYSES</span><strong>{plan.analyses.length}</strong><p>{plan.analyses.map((id) => melanomaAnalysisModules.find((module) => module.id === id)?.title).join(" · ")}</p></div><div><span>BROWSER DGE</span><strong>{plan.analyses.includes("dge") ? plan.dge_methods.length : "—"}</strong><p>{plan.analyses.includes("dge") ? plan.dge_methods.map((id) => browserDgeMethods.find((method) => method.id === id)?.short_name).join(" · ") : "Not selected"}</p></div><div><span>R PACKAGE METHODS</span><strong>{plan.analyses.includes("r_dge") ? plan.r_methods.length : "—"}</strong><p>{plan.analyses.includes("r_dge") ? plan.r_methods.map((id) => webRMethods.find((method) => method.id === id)?.short_name).join(" · ") : "Not selected"}</p></div><div><span>PURITY THRESHOLD</span><strong>{plan.analyses.includes("purity") ? plan.purity_threshold.toFixed(2) : "—"}</strong><p>{plan.analyses.includes("purity") ? "Selected sensitivity only" : "Sensitivity not selected"}</p></div></section>
    <section className="multi-run-stage"><div><span>EXECUTE CONFIRMED PLAN</span><h2>No result is loaded until you press Run.</h2><p>The files are loaded and exploration is complete. This button runs only the analyses and methods listed above. Browser R may take longer on its first download.</p></div><button disabled={running} onClick={run}>{running ? "Running selected analyses…" : output ? "Run confirmed plan again" : "Run my analysis plan"}<span>▶</span></button>{!output && !running && <footer><span>◇</span><p><strong>Results sealed</strong>Your choices are confirmed. Press Run to generate the deterministic synthetic output.</p></footer>}{running && <footer className="running"><span /><p><strong>{runStep || "Executing your plan"}</strong>Keep this page open while the selected browser and R methods finish.</p></footer>}</section>
    {output && <section className="configured-results">
      <DatasetExplorer exploration={output.exploration} compactView />
      {output.comparison && <section className="comparison-results"><header className="results-title"><div><span>FEATURE-LEVEL DGE</span><h2>{output.comparison.runs.length > 1 ? "Selected methods compared without hiding disagreement." : "Your selected DGE method, reported on its own terms."}</h2><p>Only researcher-selected methods appear below.</p></div><span className="complete-stamp">{output.comparison.runs.length} METHOD{output.comparison.runs.length === 1 ? "" : "S"} COMPLETE</span></header><div className="method-result-cards">{output.comparison.runs.map((methodRun) => <article key={methodRun.method.id} className={methodRun.method.id === output.comparison?.recommendation.method_id ? "recommended" : ""}><header><span>{methodRun.method.short_name}</span>{methodRun.method.id === output.comparison?.recommendation.method_id && <b>RECOMMENDED</b>}</header><strong>{methodRun.significant_count}</strong><p>features at BH FDR &lt; 0.05</p><dl><div><dt>Higher in responders</dt><dd>{methodRun.positive_count}</dd></div><div><dt>Lower in responders</dt><dd>{methodRun.negative_count}</dd></div><div><dt>Covariate adjusted</dt><dd>{methodRun.method.adjusts_covariates ? "Yes" : "No"}</dd></div></dl></article>)}</div>{output.comparison.pairwise.length > 0 ? <section className="agreement-panel"><div className="lab-section-head"><div><span>PAIRWISE AGREEMENT</span><h3>How similarly did the selected methods rank and classify features?</h3></div><p>Agreement is sensitivity evidence, not replication.</p></div><div className="table-scroll"><table><thead><tr><th>Method pair</th><th>Effect-rank correlation</th><th>Sign agreement</th><th>Top-50 overlap</th><th>FDR overlap</th></tr></thead><tbody>{output.comparison.pairwise.map((pair) => <tr key={`${pair.method_a}-${pair.method_b}`}><th>{browserDgeMethods.find((method) => method.id === pair.method_a)?.short_name} ↔ {browserDgeMethods.find((method) => method.id === pair.method_b)?.short_name}</th><td><span className="agreement-meter"><i style={{ width: `${100 * Math.abs(pair.effect_spearman)}%` }} /></span><b>{format(pair.effect_spearman)}</b></td><td>{format(100 * pair.sign_concordance, 1)}%</td><td>{pair.top_50_overlap} / 50</td><td>{pair.fdr_overlap}</td></tr>)}</tbody></table></div></section> : <div className="single-method-note"><span>i</span><p><strong>No comparison was requested.</strong>Select two or more DGE methods above to compare effect ranks, signs, top features, and FDR calls.</p></div>}<section className="method-recommendation"><div><span>METHOD GUIDANCE</span><h3>{output.comparison.recommendation.title}</h3><ul>{output.comparison.recommendation.rationale.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><aside><span>INTERPRETATION RULE</span><p>{output.comparison.recommendation.caution}</p><dl><div><dt>Consensus features</dt><dd>{output.comparison.consensus_features.length}</dd></div><div><dt>Recommended</dt><dd>{browserDgeMethods.find((method) => method.id === output.comparison?.recommendation.method_id)?.short_name}</dd></div></dl></aside></section><section className="method-detail-results"><header><div><span>FEATURE TABLE</span><h3>Inspect one selected method at a time.</h3></div><div>{output.comparison.runs.map((methodRun) => <button className={activeMethod === methodRun.method.id ? "active" : ""} key={methodRun.method.id} onClick={() => setActiveMethod(methodRun.method.id)}>{methodRun.method.short_name}</button>)}</div></header>{activeRun && <MethodResultTable run={activeRun} />}</section></section>}
      {output.r_execution && <section className="r-execution-results"><header className="results-title"><div><span>GENUINE R PACKAGE EXECUTION</span><h2>The selected functions ran in R inside this browser.</h2><p>{output.r_execution.r_version} · stats {output.r_execution.package_versions.stats} · synthetic matrix stayed on device</p></div><span className="complete-stamp">WEBR COMPLETE</span></header><div className="method-result-cards">{output.r_execution.methods.map((methodRun) => <article key={methodRun.method.id}><header><span>{methodRun.method.short_name}</span><b>R · {methodRun.method.package_name}</b></header><strong>{methodRun.significant_count}</strong><p>features at BH FDR &lt; 0.05</p><dl><div><dt>Higher in responders</dt><dd>{methodRun.positive_count}</dd></div><div><dt>Lower in responders</dt><dd>{methodRun.negative_count}</dd></div><div><dt>Covariate adjusted</dt><dd>{methodRun.method.adjusts_covariates ? "Yes" : "No"}</dd></div></dl></article>)}</div><section className="method-detail-results"><header><div><span>R FEATURE TABLE</span><h3>Inspect the output from each selected R function.</h3></div><div>{output.r_execution.methods.map((methodRun) => <button className={activeRMethod === methodRun.method.id ? "active" : ""} key={methodRun.method.id} onClick={() => setActiveRMethod(methodRun.method.id)}>{methodRun.method.short_name}</button>)}</div></header>{activeRRun && <RMethodResultTable run={activeRRun} />}</section><aside className="r-execution-boundary">{output.r_execution.warnings.map((warning) => <p key={warning}>i <span>{warning}</span></p>)}</aside></section>}
      {plan.analyses.includes("programs") && <section className="selected-module-result"><header><span>TME PROGRAM SUMMARY</span><h2>Related features are summarized without claiming cell abundance.</h2><p>This module aggregates the adjusted feature effects already computed for the synthetic fixture.</p></header><div className="table-scroll"><table><thead><tr><th>Program</th><th>Features</th><th>Mean adjusted effect</th><th>FDR &lt; 0.05</th></tr></thead><tbody>{output.result.program_summaries.map((program) => <tr key={program.program}><th>{program.program}</th><td>{program.feature_count}</td><td>{format(program.mean_response_effect, 3)}</td><td>{program.fdr_significant_features}</td></tr>)}</tbody></table></div></section>}
      {plan.analyses.includes("purity") && <section className="selected-module-result"><header><span>TUMOR-PURITY SENSITIVITY</span><h2>Does the adjusted program association persist after restriction?</h2><p>The restriction applies only to this selected sensitivity module.</p></header><div className="sensitivity-result-grid">{[output.result.primary, output.result.sensitivity].map((model) => <article key={model.label}><span>{model.label}</span><strong>{format(model.response_effect)}</strong><p>95% interval {format(model.confidence_low)} to {format(model.confidence_high)}</p><dl><div><dt>Samples</dt><dd>{model.sample_count}</dd></div><div><dt>p-value</dt><dd>{formatP(model.p_value)}</dd></div></dl></article>)}</div></section>}
      {output.neural && <section className="neural-engine-results"><header><div><span>NEURAL INTEGRATION · SELECTED BY RESEARCHER</span><h2>A small model connects programs and covariates for prediction.</h2><p>Five-fold cross-validation is internal to this synthetic cohort and remains separate from DGE evidence.</p></div><span className="neural-active">NEURAL ENGINE · COMPLETE</span></header><div className="neural-metrics"><article><span>Cross-validated AUROC</span><strong>{format(output.neural.auc, 3)}</strong><small>ranking performance</small></article><article><span>Balanced accuracy</span><strong>{format(100 * output.neural.balanced_accuracy, 1)}%</strong><small>threshold 0.50</small></article><article><span>Brier score</span><strong>{format(output.neural.brier_score, 3)}</strong><small>probability error</small></article><article><span>Architecture</span><strong>13 → 8 → 1</strong><small>tanh hidden layer</small></article></div><div className="neural-grid"><section><div className="lab-section-head"><div><span>MODEL SENSITIVITY</span><h3>Normalized weight-path importance</h3></div></div>{output.neural.importance.slice(0, 8).map((item) => <div className="importance-row" key={item.feature}><span>{item.feature}</span><i><em style={{ width: `${100 * item.importance / output.neural!.importance[0].importance}%` }} /></i><b>{format(100 * item.importance, 1)}%</b></div>)}</section><aside><span>INTERPRETATION BOUNDARY</span>{output.neural.warnings.map((warning) => <p key={warning}>! <span>{warning}</span></p>)}</aside></div></section>}
      {interpretation && <section className="connection-engine"><header><span>CONNECT THE DOTS · SELECTED ANALYSES ONLY</span><h2>What the combined evidence means—and what it cannot mean.</h2><p>{interpretation.summary}</p></header><div>{interpretation.connections.map((connection) => <article className={connection.kind} key={connection.id}><b>{connection.id}</b><div><span>{connection.kind.replace("-", " ")}</span><h3>{connection.title}</h3><p>{connection.finding}</p><strong>{connection.implication}</strong><small>Evidence: {connection.evidence_refs.join(" · ")}</small></div></article>)}</div></section>}
      {!output.comparison && <section className="connection-engine compact-synthesis"><header><span>INTERPRETATION BOUNDARY</span><h2>BioTrust did not infer unselected DGE evidence.</h2><p>Your plan omitted feature-level differential expression. The reported outputs are limited to {plan.analyses.map((id) => melanomaAnalysisModules.find((module) => module.id === id)?.title.toLowerCase()).join(", ")}.</p></header></section>}
      <section className="case-downloads"><div><span>RESEARCHER-SELECTED EVIDENCE PACKAGE</span><h3>Download the data, selected outputs, audit, and report.</h3><p>The audit records both what you selected and what you did not run.</p></div><div><button onClick={() => downloadText("synthetic-melanoma-metadata.csv", melanomaMetadataCsv(output.dataset), "text/csv")}>Metadata CSV ↓</button><button onClick={() => downloadText("synthetic-melanoma-counts.csv", melanomaCountsCsv(output.dataset), "text/csv")}>Counts CSV ↓</button>{output.comparison && <button onClick={() => downloadText("synthetic-melanoma-selected-dge.csv", dgeComparisonCsv(output.comparison!), "text/csv")}>Selected DGE CSV ↓</button>}{output.r_execution && <button onClick={() => downloadText("synthetic-melanoma-r-package-results.csv", webRResultsCsv(output.r_execution!), "text/csv")}>R results CSV ↓</button>}<button onClick={() => audit && downloadText("synthetic-melanoma-plan-audit.json", JSON.stringify(audit, null, 2), "application/json")}>Plan audit JSON ↓</button><button className="pdf-download" onClick={downloadPdf}>Analysis PDF ↓</button></div></section>
      <section className="post-run-actions"><button onClick={onEditPlan}>Change analyses or methods</button><button onClick={onControlled}>Open count-native real-data runner</button></section>
    </section>}
  </div>;
}
