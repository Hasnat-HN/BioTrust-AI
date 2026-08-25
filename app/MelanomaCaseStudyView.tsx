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
  melanomaAnalysisModules,
  validateMelanomaPlan,
  type MelanomaAnalysisModuleId,
  type MelanomaWorkflowPlan,
} from "./melanomaWorkflow";

export type MelanomaWorkflowOutput = {
  dataset: MelanomaDataset;
  exploration: DatasetExploration;
  result: MelanomaAnalysisResult;
  comparison?: DgeMethodComparison;
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

function toExecutionResult(output: MelanomaWorkflowOutput): ReportExecutionResult {
  const recommendedRun = output.comparison?.runs.find((run) => run.method.id === output.comparison?.recommendation.method_id) ?? output.comparison?.runs[0];
  const rows = recommendedRun?.results ?? [];
  return {
    execution_id: output.result.execution_id,
    status: "completed",
    method: output.comparison ? output.comparison.runs.map((run) => run.method.short_name).join(" + ") : output.plan.analyses.join(" + "),
    comparison: "Synthetic responder",
    reference: "Synthetic non-responder",
    design: "~ response + age + recorded sex + stage + biopsy site + prior therapy + tumor purity + batch",
    sample_count: output.result.dataset.sample_count,
    feature_count: output.result.dataset.feature_count,
    retained_feature_count: output.result.dataset.feature_count,
    input_hashes: { metadata: output.result.hashes.metadata, counts: output.result.hashes.counts },
    output_hash: output.result.hashes.results,
    software_versions: { browser: "deterministic TypeScript engine", neural: output.neural ? output.neural.architecture : "not selected" },
    warnings: output.result.warnings,
    generated_at: new Date().toISOString(),
    results: rows.map((row) => ({ feature_id: row.feature_id, log2_fold_change: row.response_effect, statistic: row.statistic, p_value: row.p_value, adjusted_p_value: row.adjusted_p_value })),
  };
}

export default function MelanomaCaseStudyView({ onToast, onOpenRunner }: { onToast: (message: string) => void; onOpenRunner: () => void }) {
  const example = useMemo(() => {
    const dataset = generateSyntheticMelanomaDataset();
    return { dataset, exploration: exploreMelanomaDataset(dataset) };
  }, []);
  return <div className="view melanoma-lab-view example-page">
    <header className="case-header"><div className="case-id"><span>WORKED EXAMPLE</span><strong>MEL-TME-02</strong><i>SYNTHETIC · SEED {MELANOMA_DEMO_SEED}</i></div><span className="case-decision pending">NO ANALYSIS RUNS HERE</span></header>
    <section className="example-hero"><div><span className="page-kicker">Example · melanoma tumor microenvironment</span><h1>See the scientific problem before building your own plan.</h1><p>This page explains the dataset, the researcher&apos;s question, and the decisions BioTrust can help with. It does not choose methods or execute results. Those decisions belong to the researcher in <strong>Analysis plan</strong>.</p><div><button className="primary-button" onClick={() => { onToast("Melanoma example loaded into Analysis plan"); onOpenRunner(); }}>Build an analysis plan <span>→</span></button><small>Next: choose analyses and methods yourself</small></div></div><aside><span>RESEARCHER ASKS</span><blockquote>Which baseline melanoma expression features and tumor-microenvironment programs are associated with synthetic PD-1 response after accounting for clinical and technical covariates?</blockquote><dl><div><dt>Population</dt><dd>180 baseline tumors</dd></div><div><dt>Outcome</dt><dd>Synthetic response</dd></div><div><dt>Data</dt><dd>Bulk RNA-seq counts</dd></div><div><dt>Covariates</dt><dd>7 declared</dd></div></dl></aside></section>
    <section className="example-story"><header><span>HOW THE EXAMPLE FLOWS</span><h2>BioTrust separates suggestion, researcher choice, execution, and interpretation.</h2></header><div>{[
      ["01", "Inspect", "BioTrust identifies count data, 180 samples, 1,200 features, response groups, library sizes, purity, batches, stage, and biopsy site."],
      ["02", "Suggest", "The method guide recommends an adjusted model because the question includes seven covariates, and offers unadjusted methods only as sensitivity views."],
      ["03", "Choose", "The researcher may select any available analysis module and one, two, or three browser DGE methods. Two or more automatically activate method comparison."],
      ["04", "Run", "Only the confirmed plan is executed. Program summaries, purity sensitivity, or neural integration run only when selected."],
      ["05", "Interpret", "BioTrust connects agreement and disagreement while keeping association, prediction, and biological mechanism separate."],
    ].map(([number, title, detail]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{detail}</p></div></article>)}</div></section>
    <DatasetExplorer exploration={example.exploration} compactView />
    <section className="example-choice-preview"><div><span>WHAT YOU WILL CONTROL</span><h2>The example becomes configurable in Analysis plan.</h2><p>Choose feature-level DGE, program summaries, tumor-purity sensitivity, neural integration, or any combination. For DGE, choose Adjusted OLS, Welch, Wilcoxon, or multiple methods for direct comparison.</p></div><button className="primary-button" onClick={onOpenRunner}>Open Analysis plan <span>→</span></button></section>
  </div>;
}

export function MelanomaAnalysisPlanView({ plan, onPlanChange, onRun, onControlled, onToast }: { plan: MelanomaWorkflowPlan; onPlanChange: (plan: MelanomaWorkflowPlan) => void; onRun: () => void; onControlled: () => void; onToast: (message: string) => void }) {
  const guidance = buildPlanGuidance(plan);
  const issues = validateMelanomaPlan(plan);
  const update = (patch: Partial<MelanomaWorkflowPlan>) => onPlanChange({ ...plan, ...patch, confirmed: false });
  const toggleAnalysis = (id: MelanomaAnalysisModuleId) => update({ analyses: plan.analyses.includes(id) ? plan.analyses.filter((item) => item !== id) : [...plan.analyses, id] });
  const toggleMethod = (id: BrowserDgeMethodId) => update({ dge_methods: plan.dge_methods.includes(id) ? plan.dge_methods.filter((item) => item !== id) : [...plan.dge_methods, id] });
  const confirm = () => {
    if (issues.length) return onToast(issues[0]);
    onPlanChange({ ...plan, confirmed: true });
    onToast("Your melanoma analysis plan is confirmed");
    window.setTimeout(onRun, 60);
  };
  return <div className="view melanoma-lab-view analysis-planner-view">
    <div className="page-head"><div><span className="page-kicker">Synthetic melanoma · researcher-selected plan</span><h1>Choose exactly what will run.</h1><p>BioTrust explains the consequences of each choice. It does not silently add analyses or replace your method selection.</p></div><span className={`planner-status ${plan.confirmed ? "confirmed" : "draft"}`}>{plan.confirmed ? "PLAN CONFIRMED" : "DRAFT PLAN"}</span></div>
    <div className="planner-layout">
      <main>
        <section className="planner-section question-builder"><header><span>01 · RESEARCH QUESTION</span><h2>What are you trying to learn?</h2></header><textarea value={plan.research_question} onChange={(event) => update({ research_question: event.target.value })} aria-label="Research question" /><div className="covariate-strip"><strong>Declared adjustment set</strong>{["Age", "Recorded sex", "Stage", "Biopsy site", "Prior therapy", "Tumor purity", "Batch"].map((item) => <span key={item}>{item}</span>)}</div></section>
        <section className="planner-section"><header><span>02 · CHOOSE ANALYSES</span><h2>Select any analysis modules you want to run.</h2><p>The dataset profile is always created first. Everything below is optional and researcher-controlled.</p></header><div className="analysis-module-grid">{melanomaAnalysisModules.map((module) => { const selected = plan.analyses.includes(module.id); return <button key={module.id} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => toggleAnalysis(module.id)}><b>{selected ? "✓" : "+"}</b><span>{module.method}</span><h3>{module.title}</h3><p>{module.question}</p><dl><div><dt>Output</dt><dd>{module.output}</dd></div><div><dt>Boundary</dt><dd>{module.boundary}</dd></div></dl></button>; })}</div></section>
        {plan.analyses.includes("dge") && <section className="planner-section dge-method-builder"><header><div><span>03 · CHOOSE DGE METHODS</span><h2>Use one method—or compare several on the same data.</h2><p>One method is allowed. Selecting two or three automatically adds a transparent comparison of agreement and disagreement.</p></div><strong>{plan.dge_methods.length} SELECTED</strong></header><div className="method-choice-grid">{browserDgeMethods.map((method) => { const selected = plan.dge_methods.includes(method.id); return <button key={method.id} className={selected ? "selected" : ""} onClick={() => toggleMethod(method.id)} aria-pressed={selected}><span className="method-check">{selected ? "✓" : "+"}</span><span className="method-role">{method.role}</span><h3>{method.name}</h3><p>{method.answers}</p><dl><div><dt>Covariate adjustment</dt><dd>{method.adjusts_covariates ? "YES" : "NO"}</dd></div><div><dt>Browser executable</dt><dd>YES</dd></div></dl><small>{method.limitation}</small></button>; })}</div>{plan.dge_methods.length >= 2 && <div className="comparison-activated"><span>↔</span><p><strong>Method comparison activated</strong>BioTrust will calculate effect-rank correlation, sign agreement, top-50 overlap, FDR overlap, consensus features, and a question-matched recommendation.</p></div>}</section>}
        {plan.analyses.includes("purity") && <section className="planner-section sensitivity-control"><header><span>04 · SENSITIVITY SETTING</span><h2>Choose the tumor-purity restriction.</h2></header><label>Minimum synthetic tumor purity<select value={plan.purity_threshold} onChange={(event) => update({ purity_threshold: Number(event.target.value) })}><option value={0.45}>≥ 0.45</option><option value={0.5}>≥ 0.50</option><option value={0.6}>≥ 0.60</option></select></label><p>This changes only the selected purity-sensitivity analysis; it does not silently remove samples from the other modules.</p></section>}
        <section className="production-methods"><div><span>COUNT-NATIVE PRODUCTION OPTIONS</span><h3>edgeR and DESeq2 remain available through the controlled runner.</h3><p>The public browser will not pretend to execute these R/Bioconductor methods. Use the real-data runner when you need count-native publication analysis.</p></div><div><span>edgeR QL</span><span>DESeq2 Wald</span><button onClick={onControlled}>Open real-data runner →</button></div></section>
      </main>
      <aside className="ai-plan-guide">
        <header><span>AI METHOD GUIDE · LOCAL RULES</span><h2>Advice updates with your choices.</h2><p>The guide reads only the declared question and synthetic dataset structure. You retain the final decision.</p></header>
        <div>{guidance.map((item) => <article className={item.tone} key={`${item.title}-${item.detail}`}><b>{item.tone === "ready" ? "✓" : item.tone === "block" ? "×" : item.tone === "consider" ? "!" : "i"}</b><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div>
        <section className="plan-receipt"><span>YOUR CURRENT PLAN</span><dl><div><dt>Analyses</dt><dd>{plan.analyses.length}</dd></div><div><dt>DGE methods</dt><dd>{plan.analyses.includes("dge") ? plan.dge_methods.length : "Not selected"}</dd></div><div><dt>Comparison</dt><dd>{plan.dge_methods.length >= 2 && plan.analyses.includes("dge") ? "Yes" : "No"}</dd></div><div><dt>Neural model</dt><dd>{plan.analyses.includes("neural") ? "Selected" : "Not selected"}</dd></div></dl></section>
        {issues.length > 0 && <div className="planner-issues">{issues.map((issue) => <p key={issue}>× {issue}</p>)}</div>}
        <button className="primary-button full" disabled={issues.length > 0} onClick={confirm}>Confirm plan and continue <span>→</span></button>
        <small>Changing any choice after confirmation creates a new draft and requires confirmation again.</small>
      </aside>
    </div>
  </div>;
}

export function MelanomaExecutionView({ plan, output, onOutput, onComplete, onEditPlan, onControlled, onToast }: { plan: MelanomaWorkflowPlan; output: MelanomaWorkflowOutput | null; onOutput: (output: MelanomaWorkflowOutput | null) => void; onComplete: (result: ReportExecutionResult) => void; onEditPlan: () => void; onControlled: () => void; onToast: (message: string) => void }) {
  const [running, setRunning] = useState(false);
  const [activeMethod, setActiveMethod] = useState<BrowserDgeMethodId>(plan.dge_methods[0] ?? "adjusted_ols");
  const activeRun = output?.comparison?.runs.find((run) => run.method.id === activeMethod) ?? output?.comparison?.runs[0];
  const interpretation = output?.comparison ? buildComparisonSynthesis(output.comparison, output.neural) : null;
  const run = () => {
    if (!plan.confirmed) return onToast("Confirm the plan before running it");
    setRunning(true);
    onOutput(null);
    window.setTimeout(() => {
      const base = runSyntheticMelanomaAnalysis(MELANOMA_DEMO_SEED, plan.purity_threshold);
      const next: MelanomaWorkflowOutput = {
        ...base,
        exploration: exploreMelanomaDataset(base.dataset),
        comparison: plan.analyses.includes("dge") ? runDgeMethodComparison(base.dataset, base.result, plan.dge_methods) : undefined,
        neural: plan.analyses.includes("neural") ? runNeuralIntegration(base.dataset) : undefined,
        plan,
      };
      onOutput(next);
      if (next.comparison) setActiveMethod(next.comparison.recommendation.method_id);
      onComplete(toExecutionResult(next));
      setRunning(false);
      onToast(`${plan.analyses.length} selected analysis module${plan.analyses.length === 1 ? "" : "s"} completed`);
    }, 220);
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
    neural_integration: output.neural,
    evidence_synthesis: interpretation,
  } : null;
  const downloadPdf = async () => {
    if (!output) return;
    const { downloadMelanomaReport } = await import("./melanomaReport");
    downloadMelanomaReport(output.result, { plan: output.plan, comparison: output.comparison, neural: output.neural });
  };
  if (!plan.confirmed) return <div className="view"><section className="results-gate"><span className="results-gate-mark">⌁</span><span className="page-kicker">Plan required</span><h1>Choose your analyses before running the melanoma example.</h1><p>Run analysis executes the exact plan confirmed by the researcher. It does not use a separate preconfigured case.</p><button className="primary-button" onClick={onEditPlan}>Open Analysis plan <span>→</span></button></section></div>;
  return <div className="view melanoma-lab-view execution-workflow-view">
    <header className="execution-plan-header"><div><span>CONFIRMED RESEARCHER PLAN</span><h1>Run the melanoma analysis you selected.</h1><p>{plan.research_question}</p></div><button onClick={onEditPlan}>Edit plan</button></header>
    <section className="execution-receipt"><div><span>ANALYSES</span><strong>{plan.analyses.length}</strong><p>{plan.analyses.map((id) => melanomaAnalysisModules.find((module) => module.id === id)?.title).join(" · ")}</p></div><div><span>DGE METHODS</span><strong>{plan.analyses.includes("dge") ? plan.dge_methods.length : "—"}</strong><p>{plan.analyses.includes("dge") ? plan.dge_methods.map((id) => browserDgeMethods.find((method) => method.id === id)?.short_name).join(" · ") : "Not selected"}</p></div><div><span>COMPARISON</span><strong>{plan.analyses.includes("dge") && plan.dge_methods.length >= 2 ? "ON" : "OFF"}</strong><p>{plan.dge_methods.length >= 2 ? "Same data and test family" : "One or zero DGE methods"}</p></div><div><span>PURITY THRESHOLD</span><strong>{plan.analyses.includes("purity") ? plan.purity_threshold.toFixed(2) : "—"}</strong><p>{plan.analyses.includes("purity") ? "Selected sensitivity only" : "Sensitivity not selected"}</p></div></section>
    <section className="multi-run-stage"><div><span>EXECUTE CONFIRMED PLAN</span><h2>No result is loaded until you press Run.</h2><p>The graphical dataset audit runs first, followed only by the modules and methods listed above.</p></div><button disabled={running} onClick={run}>{running ? "Running selected analyses…" : output ? "Run confirmed plan again" : "Run my analysis plan"}<span>▶</span></button>{!output && !running && <footer><span>◇</span><p><strong>Results sealed</strong>Your choices are confirmed. Press Run to generate the deterministic synthetic output.</p></footer>}{running && <footer className="running"><span /><p><strong>Executing your plan</strong>Data profile → selected modules → comparisons → traceable synthesis</p></footer>}</section>
    {output && <section className="configured-results">
      <DatasetExplorer exploration={output.exploration} compactView />
      {output.comparison && <section className="comparison-results"><header className="results-title"><div><span>FEATURE-LEVEL DGE</span><h2>{output.comparison.runs.length > 1 ? "Selected methods compared without hiding disagreement." : "Your selected DGE method, reported on its own terms."}</h2><p>Only researcher-selected methods appear below.</p></div><span className="complete-stamp">{output.comparison.runs.length} METHOD{output.comparison.runs.length === 1 ? "" : "S"} COMPLETE</span></header><div className="method-result-cards">{output.comparison.runs.map((methodRun) => <article key={methodRun.method.id} className={methodRun.method.id === output.comparison?.recommendation.method_id ? "recommended" : ""}><header><span>{methodRun.method.short_name}</span>{methodRun.method.id === output.comparison?.recommendation.method_id && <b>RECOMMENDED</b>}</header><strong>{methodRun.significant_count}</strong><p>features at BH FDR &lt; 0.05</p><dl><div><dt>Higher in responders</dt><dd>{methodRun.positive_count}</dd></div><div><dt>Lower in responders</dt><dd>{methodRun.negative_count}</dd></div><div><dt>Covariate adjusted</dt><dd>{methodRun.method.adjusts_covariates ? "Yes" : "No"}</dd></div></dl></article>)}</div>{output.comparison.pairwise.length > 0 ? <section className="agreement-panel"><div className="lab-section-head"><div><span>PAIRWISE AGREEMENT</span><h3>How similarly did the selected methods rank and classify features?</h3></div><p>Agreement is sensitivity evidence, not replication.</p></div><div className="table-scroll"><table><thead><tr><th>Method pair</th><th>Effect-rank correlation</th><th>Sign agreement</th><th>Top-50 overlap</th><th>FDR overlap</th></tr></thead><tbody>{output.comparison.pairwise.map((pair) => <tr key={`${pair.method_a}-${pair.method_b}`}><th>{browserDgeMethods.find((method) => method.id === pair.method_a)?.short_name} ↔ {browserDgeMethods.find((method) => method.id === pair.method_b)?.short_name}</th><td><span className="agreement-meter"><i style={{ width: `${100 * Math.abs(pair.effect_spearman)}%` }} /></span><b>{format(pair.effect_spearman)}</b></td><td>{format(100 * pair.sign_concordance, 1)}%</td><td>{pair.top_50_overlap} / 50</td><td>{pair.fdr_overlap}</td></tr>)}</tbody></table></div></section> : <div className="single-method-note"><span>i</span><p><strong>No comparison was requested.</strong>Select two or more DGE methods in Analysis plan to compare effect ranks, signs, top features, and FDR calls.</p></div>}<section className="method-recommendation"><div><span>METHOD GUIDANCE</span><h3>{output.comparison.recommendation.title}</h3><ul>{output.comparison.recommendation.rationale.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><aside><span>INTERPRETATION RULE</span><p>{output.comparison.recommendation.caution}</p><dl><div><dt>Consensus features</dt><dd>{output.comparison.consensus_features.length}</dd></div><div><dt>Recommended</dt><dd>{browserDgeMethods.find((method) => method.id === output.comparison?.recommendation.method_id)?.short_name}</dd></div></dl></aside></section><section className="method-detail-results"><header><div><span>FEATURE TABLE</span><h3>Inspect one selected method at a time.</h3></div><div>{output.comparison.runs.map((methodRun) => <button className={activeMethod === methodRun.method.id ? "active" : ""} key={methodRun.method.id} onClick={() => setActiveMethod(methodRun.method.id)}>{methodRun.method.short_name}</button>)}</div></header>{activeRun && <MethodResultTable run={activeRun} />}</section></section>}
      {plan.analyses.includes("programs") && <section className="selected-module-result"><header><span>TME PROGRAM SUMMARY</span><h2>Related features are summarized without claiming cell abundance.</h2><p>This module aggregates the adjusted feature effects already computed for the synthetic fixture.</p></header><div className="table-scroll"><table><thead><tr><th>Program</th><th>Features</th><th>Mean adjusted effect</th><th>FDR &lt; 0.05</th></tr></thead><tbody>{output.result.program_summaries.map((program) => <tr key={program.program}><th>{program.program}</th><td>{program.feature_count}</td><td>{format(program.mean_response_effect, 3)}</td><td>{program.fdr_significant_features}</td></tr>)}</tbody></table></div></section>}
      {plan.analyses.includes("purity") && <section className="selected-module-result"><header><span>TUMOR-PURITY SENSITIVITY</span><h2>Does the adjusted program association persist after restriction?</h2><p>The restriction applies only to this selected sensitivity module.</p></header><div className="sensitivity-result-grid">{[output.result.primary, output.result.sensitivity].map((model) => <article key={model.label}><span>{model.label}</span><strong>{format(model.response_effect)}</strong><p>95% interval {format(model.confidence_low)} to {format(model.confidence_high)}</p><dl><div><dt>Samples</dt><dd>{model.sample_count}</dd></div><div><dt>p-value</dt><dd>{formatP(model.p_value)}</dd></div></dl></article>)}</div></section>}
      {output.neural && <section className="neural-engine-results"><header><div><span>NEURAL INTEGRATION · SELECTED BY RESEARCHER</span><h2>A small model connects programs and covariates for prediction.</h2><p>Five-fold cross-validation is internal to this synthetic cohort and remains separate from DGE evidence.</p></div><span className="neural-active">NEURAL ENGINE · COMPLETE</span></header><div className="neural-metrics"><article><span>Cross-validated AUROC</span><strong>{format(output.neural.auc, 3)}</strong><small>ranking performance</small></article><article><span>Balanced accuracy</span><strong>{format(100 * output.neural.balanced_accuracy, 1)}%</strong><small>threshold 0.50</small></article><article><span>Brier score</span><strong>{format(output.neural.brier_score, 3)}</strong><small>probability error</small></article><article><span>Architecture</span><strong>13 → 8 → 1</strong><small>tanh hidden layer</small></article></div><div className="neural-grid"><section><div className="lab-section-head"><div><span>MODEL SENSITIVITY</span><h3>Normalized weight-path importance</h3></div></div>{output.neural.importance.slice(0, 8).map((item) => <div className="importance-row" key={item.feature}><span>{item.feature}</span><i><em style={{ width: `${100 * item.importance / output.neural!.importance[0].importance}%` }} /></i><b>{format(100 * item.importance, 1)}%</b></div>)}</section><aside><span>INTERPRETATION BOUNDARY</span>{output.neural.warnings.map((warning) => <p key={warning}>! <span>{warning}</span></p>)}</aside></div></section>}
      {interpretation && <section className="connection-engine"><header><span>CONNECT THE DOTS · SELECTED ANALYSES ONLY</span><h2>What the combined evidence means—and what it cannot mean.</h2><p>{interpretation.summary}</p></header><div>{interpretation.connections.map((connection) => <article className={connection.kind} key={connection.id}><b>{connection.id}</b><div><span>{connection.kind.replace("-", " ")}</span><h3>{connection.title}</h3><p>{connection.finding}</p><strong>{connection.implication}</strong><small>Evidence: {connection.evidence_refs.join(" · ")}</small></div></article>)}</div></section>}
      {!output.comparison && <section className="connection-engine compact-synthesis"><header><span>INTERPRETATION BOUNDARY</span><h2>BioTrust did not infer unselected DGE evidence.</h2><p>Your plan omitted feature-level differential expression. The reported outputs are limited to {plan.analyses.map((id) => melanomaAnalysisModules.find((module) => module.id === id)?.title.toLowerCase()).join(", ")}.</p></header></section>}
      <section className="case-downloads"><div><span>RESEARCHER-SELECTED EVIDENCE PACKAGE</span><h3>Download the data, selected outputs, audit, and report.</h3><p>The audit records both what you selected and what you did not run.</p></div><div><button onClick={() => downloadText("synthetic-melanoma-metadata.csv", melanomaMetadataCsv(output.dataset), "text/csv")}>Metadata CSV ↓</button><button onClick={() => downloadText("synthetic-melanoma-counts.csv", melanomaCountsCsv(output.dataset), "text/csv")}>Counts CSV ↓</button>{output.comparison && <button onClick={() => downloadText("synthetic-melanoma-selected-dge.csv", dgeComparisonCsv(output.comparison!), "text/csv")}>Selected DGE CSV ↓</button>}<button onClick={() => audit && downloadText("synthetic-melanoma-plan-audit.json", JSON.stringify(audit, null, 2), "application/json")}>Plan audit JSON ↓</button><button className="pdf-download" onClick={downloadPdf}>Analysis PDF ↓</button></div></section>
      <section className="post-run-actions"><button onClick={onEditPlan}>Change analyses or methods</button><button onClick={onControlled}>Open count-native real-data runner</button></section>
    </section>}
  </div>;
}
