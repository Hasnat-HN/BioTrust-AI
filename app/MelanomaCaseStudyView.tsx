"use client";

import { useState } from "react";
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

type Decision = "pending" | "accepted" | "rejected";
type FullRun = { dataset: MelanomaDataset; result: MelanomaAnalysisResult; comparison: DgeMethodComparison; neural: NeuralIntegrationResult };

const researchQuestion = "In baseline melanoma tumors, which expression features and tumor-microenvironment programs are associated with synthetic PD-1 response after accounting for age, recorded sex, disease stage, biopsy site, prior systemic therapy, tumor purity, and sequencing batch?";
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

function DatasetExplorer({ exploration }: { exploration: DatasetExploration }) {
  const histogramMaximum = Math.max(...exploration.library_size.histogram.map((bin) => bin.count));
  return <section className="dataset-explorer">
    <header className="lab-section-head"><div><span>01 · DATASET EXPLORATION</span><h2>Know the matrix before choosing a method.</h2><p>This descriptive pass reads structure and composition only. It does not test the response hypothesis.</p></div><span className="explore-complete">PROFILE COMPLETE</span></header>
    <div className="data-metrics"><article><span>Data type</span><strong>Bulk RNA-seq counts</strong><small>non-negative integers</small></article><article><span>Samples</span><strong>{exploration.matrix.samples}</strong><small>{exploration.groups.responder} responder · {exploration.groups.non_responder} non-responder</small></article><article><span>Features</span><strong>{exploration.matrix.features.toLocaleString()}</strong><small>generic synthetic IDs</small></article><article><span>Matrix cells</span><strong>{compact(exploration.matrix.cells)}</strong><small>{(100 * exploration.matrix.zero_rate).toFixed(1)}% zeros</small></article></div>
    <div className="exploration-grid">
      <section className="explore-chart"><header><div><span>LIBRARY SIZE DISTRIBUTION</span><h3>Counts per sample</h3></div><small>log10 scale</small></header><div className="histogram" aria-label="Library size histogram">{exploration.library_size.histogram.map((bin, index) => <div key={`${bin.label}-${index}`}><i style={{ height: `${Math.max(5, 100 * bin.count / histogramMaximum)}%` }} /><span>{bin.label.split("-")[0]}</span></div>)}</div><footer><span>Min {compact(exploration.library_size.minimum)}</span><span>Median {compact(exploration.library_size.median)}</span><span>Max {compact(exploration.library_size.maximum)}</span></footer></section>
      <section className="explore-chart composition"><header><div><span>TUMOR PURITY</span><h3>Admixture structure</h3></div><small>synthetic fraction</small></header><BarList rows={exploration.purity_bins} total={exploration.matrix.samples} /></section>
      <section className="explore-chart composition"><header><div><span>TECHNICAL DESIGN</span><h3>Sequencing batches</h3></div><small>3 levels</small></header><BarList rows={exploration.batch_counts} total={exploration.matrix.samples} /></section>
      <section className="explore-chart composition"><header><div><span>CLINICAL COMPOSITION</span><h3>Stage and biopsy site</h3></div><small>model covariates</small></header><BarList rows={[...exploration.stage_counts, ...exploration.site_counts]} total={exploration.matrix.samples} /></section>
    </div>
    <div className="suitability-checks"><header><span>METHOD SUITABILITY CHECK</span><h3>What the data structure allows—and what it requires.</h3></header>{exploration.checks.map((check) => <article key={check.label}><b className={check.status.toLowerCase()}>{check.status}</b><div><strong>{check.label}</strong><p>{check.detail}</p></div></article>)}</div>
  </section>;
}

function MethodResultTable({ run }: { run: DgeMethodRun }) {
  return <div className="table-scroll"><table className="comparison-result-table"><thead><tr><th>Feature</th><th>Program</th><th>Effect</th><th>Statistic</th><th>p-value</th><th>BH FDR</th></tr></thead><tbody>{run.results.slice(0, 12).map((row) => <tr key={row.feature_id}><th>{row.feature_id}</th><td>{row.program}</td><td>{row.response_effect > 0 ? "+" : ""}{format(row.response_effect, 3)}</td><td>{format(row.statistic)}</td><td>{formatP(row.p_value)}</td><td>{formatP(row.adjusted_p_value)}</td></tr>)}</tbody></table></div>;
}

export default function MelanomaCaseStudyView({ onToast, onOpenRunner }: { onToast: (message: string) => void; onOpenRunner: () => void }) {
  const [explored, setExplored] = useState<{ dataset: MelanomaDataset; summary: DatasetExploration } | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<BrowserDgeMethodId[]>(["adjusted_ols", "welch_t", "wilcoxon"]);
  const [purityThreshold, setPurityThreshold] = useState(0.5);
  const [decision, setDecision] = useState<Decision>("pending");
  const [acknowledged, setAcknowledged] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<FullRun | null>(null);
  const [activeMethod, setActiveMethod] = useState<BrowserDgeMethodId>("adjusted_ols");
  const interpretation = output ? buildComparisonSynthesis(output.comparison, output.neural) : null;

  const explore = () => {
    const dataset = generateSyntheticMelanomaDataset();
    setExplored({ dataset, summary: exploreMelanomaDataset(dataset) });
    setDecision("pending");
    setOutput(null);
    window.setTimeout(() => document.getElementById("dataset-profile")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  };

  const toggleMethod = (id: BrowserDgeMethodId) => {
    setSelectedMethods((current) => current.includes(id) ? current.filter((method) => method !== id) : [...current, id]);
    setDecision("pending");
    setOutput(null);
  };

  const accept = () => {
    if (selectedMethods.length < 2) return onToast("Select at least two methods so their results can be compared");
    if (!acknowledged) return onToast("Confirm the synthetic-data and method-boundary notice first");
    setDecision("accepted");
    onToast("Multi-method analysis plan accepted");
  };

  const execute = () => {
    if (!explored || decision !== "accepted") return;
    setRunning(true);
    setOutput(null);
    window.setTimeout(() => {
      const base = runSyntheticMelanomaAnalysis(MELANOMA_DEMO_SEED, purityThreshold);
      const comparison = runDgeMethodComparison(base.dataset, base.result, selectedMethods);
      const neural = runNeuralIntegration(base.dataset);
      setOutput({ ...base, comparison, neural });
      setActiveMethod(comparison.recommendation.method_id);
      setRunning(false);
      onToast(`${selectedMethods.length} DGE methods and the neural integration model completed`);
    }, 180);
  };

  const activeRun = output?.comparison.runs.find((run) => run.method.id === activeMethod) ?? output?.comparison.runs[0];
  const audit = output ? {
    format: "biotrust-melanoma-multimethod-audit",
    version: 2,
    synthetic: true,
    seed: MELANOMA_DEMO_SEED,
    research_question: researchQuestion,
    dataset_exploration: explored?.summary,
    user_choice: { decision, selected_methods: selectedMethods, purity_threshold: purityThreshold },
    statistical_execution: output.result,
    method_comparison: output.comparison,
    neural_integration: output.neural,
    evidence_synthesis: interpretation,
  } : null;

  const downloadPdf = async () => {
    if (!output) return;
    const { downloadMelanomaReport } = await import("./melanomaReport");
    downloadMelanomaReport(output.result, purityThreshold, output.comparison, output.neural);
  };

  return <div className="view melanoma-lab-view">
    <header className="case-header"><div className="case-id"><span>LIVE SYNTHETIC CASE</span><strong>MEL-TME-02</strong><i>BUILD 2 · SEED {MELANOMA_DEMO_SEED}</i></div><span className={`case-decision ${output ? "accepted" : decision}`}>{output ? "ANALYSIS COMPLETE" : decision === "accepted" ? "PLAN ACCEPTED" : "EXPLORATION"}</span></header>
    <section className="lab-hero"><div><span className="page-kicker">Melanoma tumor microenvironment · interactive method laboratory</span><h1>Explore first. Compare methods. Then interpret.</h1><p>Generate one reproducible synthetic RNA-seq cohort, inspect its structure graphically, choose multiple differential-expression methods, compare their conclusions, and test a small neural integration model without confusing prediction with evidence.</p><div className="lab-hero-actions"><button className="primary-button explore-button" onClick={explore}>{explored ? "Regenerate same dataset" : "Explore synthetic dataset"} <span>→</span></button><small>No upload · no login · no result shown before you run</small></div></div><aside><span>ANALYSIS ROUTE</span>{[["01","Explore","Matrix + covariates"],["02","Choose","2 or more methods"],["03","Run","Same data, same universe"],["04","Compare","Agreement + disagreement"],["05","Connect","Statistics + neural boundary"]].map(([number,title,detail]) => <div key={number}><b>{number}</b><p><strong>{title}</strong><small>{detail}</small></p></div>)}</aside></section>

    {!explored && <section className="explore-gate"><div className="matrix-preview"><span>COUNT MATRIX</span><div>{Array.from({ length: 60 }, (_, index) => <i key={index} style={{ opacity: .18 + ((index * 17) % 70) / 100 }} />)}</div><footer><b>180 samples</b><b>1,200 features</b></footer></div><div><span className="page-kicker">Nothing inferred yet</span><h2>The first action is descriptive, not statistical.</h2><p>Click Explore to generate the fixed synthetic cohort. BioTrust will identify the data type, dimensions, group sizes, library-size distribution, purity structure, batches, clinical composition, and which methods are defensible.</p><button onClick={explore}>Explore now <span>→</span></button></div></section>}

    {explored && <div id="dataset-profile"><DatasetExplorer exploration={explored.summary} /></div>}

    {explored && <section className="question-contract"><aside><span>02</span><strong>Research question</strong><small>The estimand controls method choice</small></aside><div><blockquote>“{researchQuestion}”</blockquote><p><strong>Primary target:</strong> conditional response association. <strong>Sensitivity target:</strong> whether feature direction and ranking persist under different distributional assumptions.</p></div></section>}

    {explored && <section className="method-lab">
      <header className="lab-section-head"><div><span>02 · CHOOSE METHODS</span><h2>Run the same question more than one way.</h2><p>Select at least two methods. Every selected method receives the identical samples, feature universe, normalization, response labels, and FDR threshold.</p></div><span className="selection-count">{selectedMethods.length} SELECTED</span></header>
      <div className="method-choice-grid">{browserDgeMethods.map((method) => { const selected = selectedMethods.includes(method.id); return <button key={method.id} className={selected ? "selected" : ""} onClick={() => toggleMethod(method.id)} aria-pressed={selected}><span className="method-check">{selected ? "✓" : "+"}</span><span className="method-role">{method.role}</span><h3>{method.name}</h3><p>{method.answers}</p><dl><div><dt>Covariate adjustment</dt><dd>{method.adjusts_covariates ? "YES" : "NO"}</dd></div><div><dt>Browser executable</dt><dd>YES</dd></div></dl><small>{method.limitation}</small></button>; })}</div>
      <div className="production-methods"><div><span>CONTROLLED PRODUCTION METHODS</span><h3>Count-native adapters remain separate.</h3><p>edgeR quasi-likelihood and DESeq2 Wald can run only through the controlled R service. The public page will never imitate them with JavaScript or expose a private API key.</p></div><div><span>edgeR QL</span><span>DESeq2 Wald</span><button onClick={onOpenRunner}>Open controlled runner →</button></div></div>
      <div className="analysis-specification"><header><span>LOCKED COMPARISON CONTRACT</span><h3>What stays identical across methods</h3></header><div><p><b>Dataset</b>SYN-MEL-20260825</p><p><b>Samples</b>180 baseline tumors</p><p><b>Universe</b>1,200 features</p><p><b>Normalization</b>log2 CPM</p><p><b>Multiplicity</b>BH across 1,200</p><label><b>Purity sensitivity</b><select value={purityThreshold} onChange={(event) => { setPurityThreshold(Number(event.target.value)); setDecision("pending"); setOutput(null); }}><option value={0.45}>≥ 0.45</option><option value={0.5}>≥ 0.50</option><option value={0.6}>≥ 0.60</option></select></label></div></div>
      <div className="method-decision"><label><input type="checkbox" checked={acknowledged} onChange={(event) => { setAcknowledged(event.target.checked); setDecision("pending"); }} /><span><strong>I understand the comparison boundary.</strong>All data are synthetic; browser methods are demonstrations; method agreement is not replication; and the neural model is exploratory prediction.</span></label><div><button className="decision-reject" onClick={() => { setDecision("rejected"); setOutput(null); }}>Reject plan</button><button className="primary-button" onClick={accept}>Accept {selectedMethods.length}-method plan</button></div></div>
    </section>}

    {explored && <section className="multi-run-stage"><div><span>03 · EXECUTE</span><h2>One dataset. {selectedMethods.length} DGE methods. One neural integration model.</h2><p>Inferential results stay sealed until the researcher accepts the comparison contract.</p></div><button disabled={decision !== "accepted" || running || selectedMethods.length < 2} onClick={execute}>{running ? "Running all analyses…" : output ? "Run accepted plan again" : "Run and compare methods"}<span>▶</span></button>{!output && !running && <footer><span>◇</span><p><strong>Results sealed</strong>Select at least two methods, confirm the boundary, and accept the plan.</p></footer>}{running && <footer className="running"><span /><p><strong>Executing shared analysis contract</strong>DGE models → BH correction → pairwise concordance → 5-fold neural integration</p></footer>}</section>}

    {output && <section className="comparison-results">
      <header className="results-title"><div><span>04 · MULTI-METHOD RESULTS</span><h2>Agreement is visible. Disagreement stays visible too.</h2><p>Each method is summarized separately before BioTrust recommends which one answers the declared question.</p></div><span className="complete-stamp">{output.comparison.runs.length} METHODS COMPLETE</span></header>
      <div className="method-result-cards">{output.comparison.runs.map((run) => <article key={run.method.id} className={run.method.id === output.comparison.recommendation.method_id ? "recommended" : ""}><header><span>{run.method.short_name}</span>{run.method.id === output.comparison.recommendation.method_id && <b>PRIMARY</b>}</header><strong>{run.significant_count}</strong><p>features at BH FDR &lt; 0.05</p><dl><div><dt>Higher in responders</dt><dd>{run.positive_count}</dd></div><div><dt>Lower in responders</dt><dd>{run.negative_count}</dd></div><div><dt>Covariate adjusted</dt><dd>{run.method.adjusts_covariates ? "Yes" : "No"}</dd></div></dl></article>)}</div>
      <section className="agreement-panel"><div className="lab-section-head"><div><span>PAIRWISE AGREEMENT</span><h3>How similarly did the methods rank and classify features?</h3></div><p>High agreement increases robustness to modeling choices. It does not make the result true in another cohort.</p></div><div className="table-scroll"><table><thead><tr><th>Method pair</th><th>Effect-rank correlation</th><th>Sign agreement</th><th>Top-50 overlap</th><th>FDR overlap</th></tr></thead><tbody>{output.comparison.pairwise.map((pair) => <tr key={`${pair.method_a}-${pair.method_b}`}><th>{browserDgeMethods.find((m) => m.id === pair.method_a)?.short_name} ↔ {browserDgeMethods.find((m) => m.id === pair.method_b)?.short_name}</th><td><span className="agreement-meter"><i style={{ width: `${100 * Math.abs(pair.effect_spearman)}%` }} /></span><b>{format(pair.effect_spearman)}</b></td><td>{format(100 * pair.sign_concordance, 1)}%</td><td>{pair.top_50_overlap} / 50</td><td>{pair.fdr_overlap}</td></tr>)}</tbody></table></div></section>
      <section className="method-recommendation"><div><span>BIOTRUST METHOD RECOMMENDATION</span><h3>{output.comparison.recommendation.title}</h3><ul>{output.comparison.recommendation.rationale.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><aside><span>WHY NOT A MAJORITY VOTE?</span><p>{output.comparison.recommendation.caution}</p><dl><div><dt>Consensus features</dt><dd>{output.comparison.consensus_features.length}</dd></div><div><dt>Primary method</dt><dd>{browserDgeMethods.find((method) => method.id === output.comparison.recommendation.method_id)?.short_name}</dd></div></dl></aside></section>
      <section className="method-detail-results"><header><div><span>FEATURE TABLE</span><h3>Inspect one method at a time.</h3></div><div>{output.comparison.runs.map((run) => <button className={activeMethod === run.method.id ? "active" : ""} key={run.method.id} onClick={() => setActiveMethod(run.method.id)}>{run.method.short_name}</button>)}</div></header>{activeRun && <MethodResultTable run={activeRun} />}</section>
      <section className="neural-engine-results"><header><div><span>05 · ACTUAL NEURAL INTEGRATION</span><h2>A small model connects programs and covariates for prediction.</h2><p>This is a real one-hidden-layer neural network trained entirely in the browser with deterministic five-fold cross-validation. It does not replace DGE.</p></div><span className="neural-active">NEURAL ENGINE · ACTIVE</span></header><div className="neural-metrics"><article><span>Cross-validated AUROC</span><strong>{format(output.neural.auc, 3)}</strong><small>ranking performance</small></article><article><span>Balanced accuracy</span><strong>{format(100 * output.neural.balanced_accuracy, 1)}%</strong><small>threshold 0.50</small></article><article><span>Brier score</span><strong>{format(output.neural.brier_score, 3)}</strong><small>probability error</small></article><article><span>Architecture</span><strong>13 → 8 → 1</strong><small>tanh hidden layer</small></article></div><div className="neural-grid"><section><div className="lab-section-head"><div><span>MODEL SENSITIVITY</span><h3>Normalized weight-path importance</h3></div></div>{output.neural.importance.slice(0, 8).map((item) => <div className="importance-row" key={item.feature}><span>{item.feature}</span><i><em style={{ width: `${100 * item.importance / output.neural.importance[0].importance}%` }} /></i><b>{format(100 * item.importance, 1)}%</b></div>)}</section><aside><span>INTERPRETATION BOUNDARY</span>{output.neural.warnings.map((warning) => <p key={warning}>! <span>{warning}</span></p>)}</aside></div></section>
      {interpretation && <section className="connection-engine"><header><span>CONNECT THE DOTS · TRACEABLE SYNTHESIS</span><h2>What the combined evidence means—and what it cannot mean.</h2><p>{interpretation.summary}</p></header><div>{interpretation.connections.map((connection) => <article className={connection.kind} key={connection.id}><b>{connection.id}</b><div><span>{connection.kind.replace("-", " ")}</span><h3>{connection.title}</h3><p>{connection.finding}</p><strong>{connection.implication}</strong><small>Evidence: {connection.evidence_refs.join(" · ")}</small></div></article>)}</div></section>}
      <section className="case-downloads"><div><span>COMPLETE EVIDENCE PACKAGE</span><h3>Download data, every method, audit, and report.</h3><p>Method-specific rows remain labeled in the combined results CSV.</p></div><div><button onClick={() => downloadText("synthetic-melanoma-metadata.csv", melanomaMetadataCsv(output.dataset), "text/csv")}>Metadata CSV ↓</button><button onClick={() => downloadText("synthetic-melanoma-counts.csv", melanomaCountsCsv(output.dataset), "text/csv")}>Counts CSV ↓</button><button onClick={() => downloadText("synthetic-melanoma-multimethod-results.csv", dgeComparisonCsv(output.comparison), "text/csv")}>All methods CSV ↓</button><button onClick={() => audit && downloadText("synthetic-melanoma-comparison-audit.json", JSON.stringify(audit, null, 2), "application/json")}>Audit JSON ↓</button><button className="pdf-download" onClick={downloadPdf}>Comparison PDF ↓</button></div></section>
    </section>}

    <section className="case-sources"><div><span>SCIENTIFIC BASIS</span><h2>Methods are chosen from the question and data structure.</h2><p>The literature motivates this synthetic design; it does not validate its generated outcome.</p></div><div><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5531419/" target="_blank" rel="noreferrer"><strong>Ayers et al., JCI 2017</strong><span>T-cell-inflamed expression rationale ↗</span></a><a href="https://www.nature.com/articles/ncomms9971" target="_blank" rel="noreferrer"><strong>Aran et al., Nature Communications 2015</strong><span>Tumor-purity implications ↗</span></a><a href="https://bioconductor.org/packages/release/bioc/vignettes/edgeR/inst/doc/edgeRUsersGuide.pdf" target="_blank" rel="noreferrer"><strong>edgeR User&apos;s Guide</strong><span>Count-native production analysis ↗</span></a><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3458527/" target="_blank" rel="noreferrer"><strong>Wu &amp; Smyth, NAR 2012</strong><span>Correlation-aware gene-set testing ↗</span></a></div></section>
  </div>;
}
