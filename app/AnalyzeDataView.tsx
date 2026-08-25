"use client";

import { useMemo, useState } from "react";
import {
  levelsFor,
  parseUserDataset,
  runUserAnalysis,
  toReportResult,
  userAnalysisMethods,
  userResultsCsv,
  validateUserSetup,
  type UserAnalysisMethodId,
  type UserAnalysisOutput,
  type UserAnalysisSetup,
  type UserDataset,
} from "./userDataAnalysis";

type Props = {
  onToast: (message: string) => void;
  onControlled: () => void;
};

const emptySetup: UserAnalysisSetup = {
  question: "",
  conditionColumn: "",
  referenceLevel: "",
  comparisonLevel: "",
  covariates: [],
  methods: [],
};

const formatNumber = (value: number) => {
  if (value !== 0 && Math.abs(value) < 0.001) return value.toExponential(2);
  return value.toFixed(3);
};

const compact = (value: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function downloadText(filename: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DatasetProfile({ dataset }: { dataset: UserDataset }) {
  const maximum = Math.max(...dataset.summary.libraryHistogram.map((bin) => bin.count), 1);
  return (
    <section className="upload-profile" aria-label="Uploaded dataset profile">
      <header className="analysis-section-heading">
        <div><span>2 · AUTOMATIC DATA CHECK</span><h2>BioTrust understands the files before asking for a method.</h2><p>This step is descriptive. No group association has been tested.</p></div>
        <b>FILES MATCHED</b>
      </header>
      <div className="upload-fact-grid">
        <article><span>Data type</span><strong>{dataset.summary.integerNonnegative ? "RNA-seq-like counts" : "Non-negative matrix"}</strong><small>{dataset.summary.integerNonnegative ? "integer input" : "contains non-integers"}</small></article>
        <article><span>Samples</span><strong>{dataset.summary.samples}</strong><small>metadata rows matched</small></article>
        <article><span>Features</span><strong>{dataset.summary.features.toLocaleString()}</strong><small>{compact(dataset.summary.cells)} matrix cells</small></article>
        <article><span>Zero values</span><strong>{(100 * dataset.summary.zeroRate).toFixed(1)}%</strong><small>before transformation</small></article>
      </div>
      <div className="upload-profile-grid">
        <section>
          <div className="mini-title"><span>LIBRARY SIZES</span><strong>Counts per sample · log10 scale</strong></div>
          <div className="upload-histogram" aria-label="Library size histogram">
            {dataset.summary.libraryHistogram.map((bin) => <span key={bin.label}><i style={{ height: `${Math.max(8, 100 * bin.count / maximum)}%` }} /><small>{bin.label}</small></span>)}
          </div>
          <dl className="upload-range"><div><dt>Minimum</dt><dd>{compact(dataset.summary.libraryMinimum)}</dd></div><div><dt>Median</dt><dd>{compact(dataset.summary.libraryMedian)}</dd></div><div><dt>Maximum</dt><dd>{compact(dataset.summary.libraryMaximum)}</dd></div></dl>
        </section>
        <section className="detected-columns">
          <div className="mini-title"><span>METADATA STRUCTURE</span><strong>Variables available for your question</strong></div>
          <dl><div><dt>Sample identifier</dt><dd>{dataset.sampleIdColumn}</dd></div><div><dt>Group candidates</dt><dd>{dataset.categoricalColumns.length}</dd></div><div><dt>Numeric variables</dt><dd>{dataset.numericColumns.length}</dd></div><div><dt>Total study variables</dt><dd>{dataset.metadataColumns.length - 1}</dd></div></dl>
          <p>{dataset.categoricalColumns.slice(0, 5).join(" · ")}{dataset.categoricalColumns.length > 5 ? " · …" : ""}</p>
        </section>
      </div>
    </section>
  );
}

function Results({ dataset, output, onToast }: { dataset: UserDataset; output: UserAnalysisOutput; onToast: (message: string) => void }) {
  const [activeMethod, setActiveMethod] = useState<UserAnalysisMethodId>(output.recommendation.methodId);
  const activeRun = output.runs.find((run) => run.method.id === activeMethod) ?? output.runs[0];
  const reportResult = toReportResult(dataset, output);
  const downloadPdf = async () => {
    const { downloadAnalysisReport } = await import("./report");
    downloadAnalysisReport({
      result: reportResult,
      isSynthetic: false,
      projectName: "Browser-local RNA-seq exploration",
      datasetName: dataset.countsFileName,
      researchQuestion: output.setup.question,
      conditionColumn: output.setup.conditionColumn,
      covariates: output.setup.covariates,
    });
    onToast("Analysis PDF downloaded");
  };
  const audit = {
    execution_id: output.executionId,
    generated_at: output.generatedAt,
    boundary: "browser-local",
    files: { counts: dataset.countsFileName, metadata: dataset.metadataFileName },
    input_hashes: output.inputHashes,
    output_hash: output.outputHash,
    dataset_summary: dataset.summary,
    setup: output.setup,
    software: Object.fromEntries(output.runs.map((run) => [run.method.id, run.software])),
    recommendation: output.recommendation,
    comparisons: output.comparisons,
    warnings: output.warnings,
  };
  return (
    <section className="user-results" aria-live="polite">
      <header className="analysis-section-heading result-heading">
        <div><span>4 · RESULTS</span><h2>The exact methods you selected have finished.</h2><p>{output.executionId} · {output.sampleCount} samples · {output.featureCount.toLocaleString()} features</p></div>
        <b>RUN COMPLETE</b>
      </header>
      <div className="user-result-cards">
        {output.runs.map((run) => <article key={run.method.id} className={run.method.id === output.recommendation.methodId ? "recommended" : ""}><span>{run.method.engine}</span><h3>{run.method.shortName}</h3><strong>{run.significantCount}</strong><p>features at BH FDR &lt; 0.05</p><dl><div><dt>Higher in {output.setup.comparisonLevel}</dt><dd>{run.positiveCount}</dd></div><div><dt>Lower in {output.setup.comparisonLevel}</dt><dd>{run.negativeCount}</dd></div></dl><small>{run.software}</small></article>)}
      </div>
      {output.comparisons.length > 0 && <section className="user-comparison-panel"><div className="mini-title"><span>METHOD COMPARISON</span><strong>Agreement is a sensitivity check, not replication</strong></div><div className="table-scroll"><table><thead><tr><th>Methods</th><th>Effect-sign agreement</th><th>Top-feature overlap</th><th>FDR overlap</th></tr></thead><tbody>{output.comparisons.map((comparison) => <tr key={`${comparison.methodA}-${comparison.methodB}`}><th>{userAnalysisMethods.find((method) => method.id === comparison.methodA)?.shortName} ↔ {userAnalysisMethods.find((method) => method.id === comparison.methodB)?.shortName}</th><td>{(100 * comparison.signAgreement).toFixed(1)}%</td><td>{comparison.topFeatureOverlap}</td><td>{comparison.fdrOverlap}</td></tr>)}</tbody></table></div></section>}
      <section className="user-recommendation"><span>GUIDED INTERPRETATION</span><h3>{output.recommendation.title}</h3><ul>{output.recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p><strong>Boundary:</strong> {output.recommendation.caution}</p></section>
      <section className="user-result-table">
        <header><div><span>FEATURE RESULTS</span><h3>Inspect one selected method at a time.</h3></div><div>{output.runs.map((run) => <button key={run.method.id} className={activeMethod === run.method.id ? "active" : ""} onClick={() => setActiveMethod(run.method.id)}>{run.method.shortName}</button>)}</div></header>
        <div className="table-scroll"><table><thead><tr><th>Feature</th><th>Effect</th><th>Statistic</th><th>p-value</th><th>BH FDR</th></tr></thead><tbody>{activeRun.results.slice(0, 100).map((row) => <tr key={row.featureId}><th>{row.featureId}</th><td>{formatNumber(row.effect)}</td><td>{formatNumber(row.statistic)}</td><td>{formatNumber(row.pValue)}</td><td>{formatNumber(row.adjustedPValue)}</td></tr>)}</tbody></table></div>
        {activeRun.results.length > 100 && <p>Showing the first 100 FDR-ranked features. The CSV contains every result.</p>}
      </section>
      <section className="user-decision-trail">
        <header><span>VISIBLE PROCESS RECORD</span><h3>What happened at each step.</h3><p>This is an auditable explanation of the workflow, not hidden chain-of-thought.</p></header>
        <ol>
          <li><span>1</span><div><strong>Files were validated</strong><p>Sample identifiers matched; the matrix contained {output.featureCount.toLocaleString()} features across {dataset.summary.samples} uploaded samples.</p></div></li>
          <li><span>2</span><div><strong>The scientific contrast was fixed</strong><p>{output.setup.comparisonLevel} versus {output.setup.referenceLevel} within {output.setup.conditionColumn}; {output.sampleCount} samples entered the model.</p></div></li>
          <li><span>3</span><div><strong>The researcher chose the methods</strong><p>{output.runs.map((run) => run.method.shortName).join(" · ")}. Nothing else was run.</p></div></li>
          <li><span>4</span><div><strong>Multiplicity was controlled</strong><p>Each selected method tested the same feature universe and applied Benjamini–Hochberg adjustment.</p></div></li>
          <li><span>5</span><div><strong>The interpretation stayed bounded</strong><p>Results describe associations in these uploaded data; publication requires diagnostics, count-native modeling, and independent review.</p></div></li>
        </ol>
      </section>
      <section className="user-downloads"><div><span>DOWNLOAD YOUR RECORD</span><h3>Keep the result, plan, and interpretation together.</h3></div><div><button onClick={() => downloadText(`${output.executionId}-results.csv`, userResultsCsv(output), "text/csv")}>Results CSV ↓</button><button onClick={() => downloadText(`${output.executionId}-audit.json`, JSON.stringify(audit, null, 2), "application/json")}>Audit JSON ↓</button><button className="pdf-download" onClick={downloadPdf}>Analysis PDF ↓</button></div></section>
    </section>
  );
}

export default function AnalyzeDataView({ onToast, onControlled }: Props) {
  const [countsFile, setCountsFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [dataset, setDataset] = useState<UserDataset | null>(null);
  const [setup, setSetup] = useState<UserAnalysisSetup>(emptySetup);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [output, setOutput] = useState<UserAnalysisOutput | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const issues = useMemo(() => dataset ? validateUserSetup(dataset, setup) : [], [dataset, setup]);
  const update = (next: Partial<UserAnalysisSetup>) => {
    setSetup((current) => ({ ...current, ...next }));
    setConfirmed(false);
    setOutput(null);
    setError("");
  };
  const inspectFiles = async () => {
    if (!countsFile || !metadataFile) return;
    setLoading(true);
    setError("");
    setOutput(null);
    try {
      const parsed = parseUserDataset(await countsFile.text(), await metadataFile.text(), countsFile.name, metadataFile.name);
      const conditionColumn = parsed.categoricalColumns[0];
      const levels = levelsFor(parsed, conditionColumn);
      setDataset(parsed);
      setSetup({ ...emptySetup, conditionColumn, referenceLevel: levels[0] ?? "", comparisonLevel: levels[1] ?? "" });
      onToast("Files matched and dataset profile created");
      window.setTimeout(() => document.getElementById("define-question")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (reason) {
      setDataset(null);
      setError(reason instanceof Error ? reason.message : "The files could not be read.");
    } finally {
      setLoading(false);
    }
  };
  const reset = () => {
    setCountsFile(null);
    setMetadataFile(null);
    setDataset(null);
    setSetup(emptySetup);
    setOutput(null);
    setConfirmed(false);
    setError("");
    setUploadKey((value) => value + 1);
  };
  const conditionLevels = dataset && setup.conditionColumn ? levelsFor(dataset, setup.conditionColumn) : [];
  const selectCondition = (conditionColumn: string) => {
    const levels = dataset ? levelsFor(dataset, conditionColumn) : [];
    update({ conditionColumn, referenceLevel: levels[0] ?? "", comparisonLevel: levels[1] ?? "", covariates: setup.covariates.filter((column) => column !== conditionColumn) });
  };
  const toggleCovariate = (column: string) => update({ covariates: setup.covariates.includes(column) ? setup.covariates.filter((item) => item !== column) : [...setup.covariates, column] });
  const toggleMethod = (method: UserAnalysisMethodId) => update({ methods: setup.methods.includes(method) ? setup.methods.filter((item) => item !== method) : [...setup.methods, method] });
  const run = async () => {
    if (!dataset || !confirmed || issues.length) return;
    setRunning(true);
    setError("");
    setProgress("Preparing the selected samples and feature matrix");
    try {
      const result = await runUserAnalysis(dataset, setup, setProgress);
      setOutput(result);
      setProgress("Analysis complete");
      onToast("Your selected analysis completed locally");
      window.setTimeout(() => document.getElementById("user-analysis-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The selected analysis could not be completed.");
    } finally {
      setRunning(false);
    }
  };
  return (
    <div className="view analyze-data-view">
      <section className="analyze-hero">
        <div><span className="page-kicker">Analyze your data</span><h1>Load the files. Inspect the study. Choose what actually runs.</h1><p>Your count matrix and metadata stay in this browser. BioTrust first checks their structure, then asks for the question, contrast, covariates, and methods.</p></div>
        <aside><strong>ONLINE WORKFLOW</strong><span>CSV or TSV input</span><span>JavaScript + genuine R</span><span>No server upload</span></aside>
      </section>
      <section className="simple-flow" aria-label="Analysis workflow">
        {["Load files", "Inspect data", "Choose analysis", "Run and review"].map((label, index) => <div className={(dataset ? index <= (output ? 3 : 2) : index === 0) ? "active" : ""} key={label}><span>{output && index < 4 ? "✓" : index + 1}</span><strong>{label}</strong></div>)}
      </section>
      <section className="upload-panel">
        <header className="analysis-section-heading"><div><span>1 · LOAD DATA</span><h2>Two files create one analyzable study.</h2><p>The count matrix holds features by sample. Metadata holds one sample per row.</p></div>{dataset && <button onClick={reset}>Replace files</button>}</header>
        {!dataset && <>
          <div className="file-format-guide"><article><strong>Count matrix</strong><code>feature_id,S01,S02,S03,S04<br />GENE_A,12,19,8,22</code></article><article><strong>Sample metadata</strong><code>sample_id,group,batch,age<br />S01,A,B1,54</code></article></div>
          <div className="file-drop-grid" key={uploadKey}>
            <label className={countsFile ? "loaded" : ""}><span>{countsFile ? "✓" : "01"}</span><strong>Count matrix</strong><p>{countsFile?.name ?? "Choose a CSV or TSV file"}</p><input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(event) => setCountsFile(event.target.files?.[0] ?? null)} /></label>
            <label className={metadataFile ? "loaded" : ""}><span>{metadataFile ? "✓" : "02"}</span><strong>Sample metadata</strong><p>{metadataFile?.name ?? "Choose a CSV or TSV file"}</p><input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(event) => setMetadataFile(event.target.files?.[0] ?? null)} /></label>
          </div>
          <button className="primary-button inspect-files" disabled={!countsFile || !metadataFile || loading} onClick={inspectFiles}>{loading ? "Reading and matching files…" : "Inspect my files"} <span>→</span></button>
        </>}
      </section>
      {error && <div className="user-analysis-error" role="alert"><span>!</span><div><strong>BioTrust stopped before execution</strong><p>{error}</p></div></div>}
      {dataset && <DatasetProfile dataset={dataset} />}
      {dataset && <section className="question-builder" id="define-question">
        <header className="analysis-section-heading"><div><span>3 · DEFINE AND CHOOSE</span><h2>Tell BioTrust what comparison you want.</h2><p>These controls define the exact analysis. Nothing is inferred silently.</p></div><b>{confirmed ? "PLAN CONFIRMED" : "DRAFT PLAN"}</b></header>
        <div className="question-layout">
          <main>
            <label className="research-question-field"><span>Scientific question</span><textarea value={setup.question} onChange={(event) => update({ question: event.target.value })} placeholder="Example: Which features differ between treatment and control after accounting for batch and age?" /></label>
            <section className="contrast-builder"><div><label>Condition or outcome<select value={setup.conditionColumn} onChange={(event) => selectCondition(event.target.value)}>{dataset.categoricalColumns.map((column) => <option key={column}>{column}</option>)}</select></label><label>Reference level<select value={setup.referenceLevel} onChange={(event) => update({ referenceLevel: event.target.value })}>{conditionLevels.filter((level) => level !== setup.comparisonLevel).map((level) => <option key={level}>{level}</option>)}</select></label><label>Comparison level<select value={setup.comparisonLevel} onChange={(event) => update({ comparisonLevel: event.target.value })}>{conditionLevels.filter((level) => level !== setup.referenceLevel).map((level) => <option key={level}>{level}</option>)}</select></label><button onClick={() => update({ referenceLevel: setup.comparisonLevel, comparisonLevel: setup.referenceLevel })}>Swap contrast</button></div><p><strong>Effect direction:</strong> positive values mean higher expression in {setup.comparisonLevel || "comparison"} than {setup.referenceLevel || "reference"}.</p></section>
            <section className="covariate-builder"><div className="mini-title"><span>OPTIONAL COVARIATES</span><strong>Select variables your question needs to adjust for</strong></div><div>{dataset.metadataColumns.filter((column) => column !== dataset.sampleIdColumn && column !== setup.conditionColumn).map((column) => <label key={column} className={setup.covariates.includes(column) ? "selected" : ""}><input type="checkbox" checked={setup.covariates.includes(column)} onChange={() => toggleCovariate(column)} /><span>{column}</span><small>{dataset.numericColumns.includes(column) ? "numeric" : "categorical"}</small></label>)}</div>{dataset.metadataColumns.length <= 2 && <p>No additional metadata variables are available.</p>}</section>
            <section className="user-method-builder"><div className="mini-title"><span>ANALYSIS METHODS</span><strong>Choose one method or compare several on the same data</strong></div><div>{userAnalysisMethods.map((method) => { const selected = setup.methods.includes(method.id); return <button key={method.id} className={selected ? "selected" : ""} onClick={() => toggleMethod(method.id)} aria-pressed={selected}><span>{selected ? "✓" : "+"}</span><small>{method.engine} · {method.role}</small><h3>{method.name}</h3><p>{method.description}</p><em>{method.boundary}</em></button>; })}</div></section>
          </main>
          <aside className="user-method-guide">
            <span>METHOD GUIDE</span><h3>Advice based on the plan you built.</h3>
            {setup.covariates.length > 0 ? <article className={setup.methods.some((id) => userAnalysisMethods.find((method) => method.id === id)?.adjustsCovariates) ? "ready" : "warning"}><strong>{setup.covariates.length} covariate{setup.covariates.length === 1 ? "" : "s"} declared</strong><p>{setup.methods.some((id) => userAnalysisMethods.find((method) => method.id === id)?.adjustsCovariates) ? "An adjusted method is selected and can answer the conditional question." : "Choose JS adjusted OLS or R adjusted OLS; unadjusted screens cannot answer this question."}</p></article> : <article><strong>No covariates selected</strong><p>A two-group method can answer the current marginal comparison. Add covariates only when scientifically justified.</p></article>}
            <article><strong>{setup.methods.length || "No"} method{setup.methods.length === 1 ? "" : "s"} selected</strong><p>{setup.methods.length > 1 ? "BioTrust will compare direction, top features, and FDR overlap without averaging disagreement away." : "Select a second method if you need a sensitivity comparison."}</p></article>
            <article className="boundary"><strong>Publication boundary</strong><p>These online methods use log-CPM. For count-native edgeR or DESeq2, use the controlled R runner and review diagnostics.</p><button onClick={onControlled}>Open advanced runner →</button></article>
            {issues.length > 0 && <div className="plan-issues">{issues.map((issue) => <p key={issue}><span>×</span>{issue}</p>)}</div>}
            <div className="confirm-user-plan"><input id="confirm-user-plan" type="checkbox" checked={confirmed} disabled={issues.length > 0} onChange={(event) => setConfirmed(event.target.checked)} /><label htmlFor="confirm-user-plan"><strong>Confirm this exact plan</strong><small>I reviewed the question, contrast, covariates, and methods.</small></label></div>
            <button className="primary-button run-user-analysis" disabled={!confirmed || issues.length > 0 || running} onClick={run}>{running ? progress : output ? "Run confirmed plan again" : "Run confirmed plan"} <span>{running ? "◌" : "▶"}</span></button>
          </aside>
        </div>
      </section>}
      {dataset && output && <div id="user-analysis-results"><Results dataset={dataset} output={output} onToast={onToast} /></div>}
    </div>
  );
}
