"use client";

import { useMemo, useState } from "react";
import {
  MELANOMA_DEMO_SEED,
  buildMelanomaInterpretation,
  melanomaCountsCsv,
  melanomaMetadataCsv,
  melanomaResultsCsv,
  runSyntheticMelanomaAnalysis,
  type MelanomaAnalysisResult,
  type MelanomaDataset,
  type ModelResult,
} from "./melanomaDemo";

type Decision = "pending" | "accepted" | "modified" | "rejected";

const researchQuestion = "In baseline melanoma tumors, is a stronger T-cell-inflamed expression program associated with response to PD-1 blockade after accounting for age, recorded sex, disease stage, biopsy site, prior systemic therapy, tumor purity, and sequencing batch?";

const formatNumber = (value: number, digits = 2) => value.toFixed(digits);
const formatP = (value: number) => value < 0.001 ? value.toExponential(2) : value.toFixed(3);

function downloadText(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ModelRow({ model }: { model: ModelResult }) {
  return (
    <tr>
      <th><strong>{model.label}</strong><small>{model.formula}</small></th>
      <td>{model.sample_count}</td>
      <td>{formatNumber(model.response_effect)}</td>
      <td>{formatNumber(model.confidence_low)} to {formatNumber(model.confidence_high)}</td>
      <td>{formatP(model.p_value)}</td>
    </tr>
  );
}

export default function MelanomaCaseStudyView({ onToast }: { onToast: (message: string) => void }) {
  const [decision, setDecision] = useState<Decision>("pending");
  const [acknowledged, setAcknowledged] = useState(false);
  const [showModification, setShowModification] = useState(false);
  const [purityThreshold, setPurityThreshold] = useState(0.5);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<{ dataset: MelanomaDataset; result: MelanomaAnalysisResult } | null>(null);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const decisionLabel = decision === "modified" ? "MODIFIED + ACCEPTED" : decision === "accepted" ? "ACCEPTED" : decision === "rejected" ? "REJECTED" : "AWAITING DECISION";
  const synthesis = useMemo(() => run ? buildMelanomaInterpretation(run.result) : null, [run]);
  const audit = useMemo(() => run ? {
    format: "biotrust-synthetic-melanoma-audit",
    version: 1,
    synthetic: true,
    research_question: researchQuestion,
    ai_choice: {
      proposal: "Multivariable adjusted T-cell program-score model with feature-level screen and a tumor-purity sensitivity analysis.",
      production_recommendation: "edgeR quasi-likelihood for count-level differential expression and CAMERA for competitive gene-set testing in a controlled R runner.",
    },
    user_choice: { decision, sensitivity_purity_threshold: purityThreshold, acknowledged_synthetic_only: acknowledged },
    execution: run.result,
    interpretation: synthesis,
  } : null, [acknowledged, decision, purityThreshold, run, synthesis]);

  const accept = (modified = false) => {
    if (!acknowledged) {
      onToast("Confirm the synthetic-data notice before accepting the proposal");
      return;
    }
    setDecision(modified ? "modified" : "accepted");
    setShowModification(false);
    setRun(null);
    setShowSynthesis(false);
    onToast(modified ? "Modified proposal accepted and recorded" : "Proposal accepted and recorded");
  };

  const reject = () => {
    setDecision("rejected");
    setRun(null);
    setShowSynthesis(false);
    setRunning(false);
    onToast("Proposal rejected; no analysis was run");
  };

  const execute = () => {
    if (decision !== "accepted" && decision !== "modified") return;
    setRunning(true);
    setRun(null);
    setShowSynthesis(false);
    window.setTimeout(() => {
      const output = runSyntheticMelanomaAnalysis(MELANOMA_DEMO_SEED, purityThreshold);
      setRun(output);
      setRunning(false);
      onToast("Synthetic melanoma analysis completed in this browser");
    }, 180);
  };

  const downloadPdf = async () => {
    if (!run) return;
    const { downloadMelanomaReport } = await import("./melanomaReport");
    downloadMelanomaReport(run.result, purityThreshold);
  };

  return (
    <div className="view melanoma-case-view">
      <header className="case-header">
        <div className="case-id"><span>SYNTHETIC CASE</span><strong>MEL-TME-01</strong><i>SEED {MELANOMA_DEMO_SEED}</i></div>
        <span className={`case-decision ${decision}`}>{decisionLabel}</span>
      </header>

      <section className="case-hero">
        <div>
          <span className="page-kicker">Worked research example · melanoma tumor microenvironment</span>
          <h1>A scientific question you can actually run.</h1>
          <p>Follow a complete decision trail from a researcher&apos;s question to a deterministic browser calculation. No result is preloaded and every value is synthetic.</p>
        </div>
        <dl>
          <div><dt>Study design</dt><dd>Baseline bulk RNA-seq</dd></div>
          <div><dt>Synthetic cohort</dt><dd>180 tumors</dd></div>
          <div><dt>Features</dt><dd>1,200 generic IDs</dd></div>
          <div><dt>Covariates</dt><dd>7 clinical + technical</dd></div>
        </dl>
      </section>

      <ol className="case-timeline" aria-label="Analysis workflow">
        <li className="active"><span>01</span><strong>Ask</strong><small>Define the estimand</small></li>
        <li className={decision !== "pending" ? "active" : ""}><span>02</span><strong>Review</strong><small>Inspect assumptions</small></li>
        <li className={decision === "accepted" || decision === "modified" ? "active" : ""}><span>03</span><strong>Decide</strong><small>Accept, modify, reject</small></li>
        <li className={run ? "active" : ""}><span>04</span><strong>Run</strong><small>Generate and calculate</small></li>
        <li className={run ? "active" : ""}><span>05</span><strong>Interpret</strong><small>Respect claim limits</small></li>
      </ol>

      <section className="case-question">
        <aside><span>01</span><strong>Researcher asks</strong><small>The scientific target—not a software instruction</small></aside>
        <blockquote>“{researchQuestion}”</blockquote>
      </section>

      <section className="case-proposal">
        <header>
          <div><span>02 · ANALYSIS PROPOSAL</span><h2>Separate the biological hypothesis from what this dataset can estimate.</h2></div>
          <span className="proposal-origin">AI_CHOICE · PROPOSAL ONLY</span>
        </header>
        <div className="proposal-grid">
          <article>
            <span>Target estimand</span>
            <h3>Adjusted response association</h3>
            <p>The mean difference in a predeclared T-cell-inflamed expression score between synthetic responders and non-responders, conditional on tumor purity and batch.</p>
          </article>
          <article>
            <span>Primary browser model</span>
            <h3>Score-level linear model</h3>
            <code>score ~ response + age + sex + stage + biopsy_site + prior_therapy + tumor_purity + batch</code>
            <p>Reports an adjusted effect, standard error, 95% interval, test statistic, and p-value.</p>
          </article>
          <article>
            <span>Feature screen</span>
            <h3>1,200 adjusted models + BH FDR</h3>
            <code>log2_CPM ~ response + age + sex + stage + biopsy_site + prior_therapy + tumor_purity + batch</code>
            <p>Generic feature IDs avoid implying real gene-level evidence. Multiplicity is controlled across all features.</p>
          </article>
          <article>
            <span>Sensitivity</span>
            <h3>Higher-purity subset</h3>
            <code>tumor_purity ≥ {purityThreshold.toFixed(2)}</code>
            <p>Checks whether the primary direction persists after excluding more heavily admixed synthetic tumors.</p>
          </article>
        </div>

        <div className="covariate-contract">
          <header><div><span>MULTIVARIABLE DESIGN</span><h3>Every covariate has a declared role and encoding.</h3></div><small>Reference levels are explicit so the response coefficient remains interpretable.</small></header>
          <div className="table-scroll"><table><thead><tr><th>Variable</th><th>Type / encoding</th><th>Why it enters the model</th><th>Reference or scale</th></tr></thead><tbody>
            <tr><th>Age</th><td>Continuous</td><td>Possible clinical composition difference</td><td>Centered at 60; per 10 years</td></tr>
            <tr><th>Recorded sex</th><td>Binary indicator</td><td>Possible cohort composition difference</td><td>Female reference</td></tr>
            <tr><th>Disease stage</th><td>Binary indicator</td><td>Extent of disease may relate to biology and response</td><td>Stage III reference</td></tr>
            <tr><th>Biopsy site</th><td>Two indicators</td><td>Tissue context can shift bulk expression</td><td>Skin reference; lymph node / visceral</td></tr>
            <tr><th>Prior systemic therapy</th><td>Binary indicator</td><td>Previous treatment can alter cohort composition</td><td>No reference</td></tr>
            <tr><th>Tumor purity</th><td>Continuous</td><td>Bulk expression mixes tumor and non-tumor signal</td><td>Observed synthetic fraction</td></tr>
            <tr><th>Sequencing batch</th><td>Two indicators</td><td>Controls designed technical shifts</td><td>Batch 1 reference</td></tr>
          </tbody></table></div>
          <p>These covariates improve the stated conditional comparison; they do not guarantee that all confounding has been removed. Interactions, nonlinear terms, missingness, and repeated measures would require separate design decisions.</p>
        </div>

        <div className="assumption-ledger">
          <header><strong>Assumptions requiring researcher review</strong><small>These are visible reasoning steps, not hidden chain-of-thought.</small></header>
          <div><span>A1</span><p><strong>Timing is aligned.</strong> Expression and response labels represent a baseline-before-treatment design.</p><b>REQUIRED</b></div>
          <div><span>A2</span><p><strong>The declared clinical and technical covariates are measured adequately.</strong> Important omitted confounders, miscoding, or nonlinearity would still bias an association.</p><b>REQUIRED</b></div>
          <div><span>A3</span><p><strong>The program was specified before outcome testing.</strong> It is not selected because these synthetic results looked favorable.</p><b>REQUIRED</b></div>
          <div><span>A4</span><p><strong>Samples are independent.</strong> No repeated tumors or patient-level clustering is represented.</p><b>REQUIRED</b></div>
        </div>

        <div className="method-boundary">
          <div>
            <span>WHAT RUNS ONLINE</span>
            <strong>Deterministic JavaScript demonstration</strong>
            <p>Procedural count generation, log2 CPM, program scoring, ordinary least squares, normal-approximation tests, and Benjamini-Hochberg adjustment.</p>
          </div>
          <div>
            <span>WHAT A CONTROLLED PRODUCTION RUNNER SHOULD USE</span>
            <strong>edgeR quasi-likelihood + CAMERA</strong>
            <p>Count-aware feature modeling and a competitive gene-set test that accounts for inter-feature correlation. This page does not claim to execute either R package.</p>
          </div>
        </div>
      </section>

      <section className="decision-panel">
        <div>
          <span>03 · RESEARCHER DECISION</span>
          <h2>No proposal changes the plan silently.</h2>
          <label className="synthetic-ack"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span><strong>I understand that every sample and result is synthetic.</strong>This is research-software education, not medical evidence or clinical advice.</span></label>
        </div>
        <div className="decision-actions">
          <button className="decision-reject" onClick={reject}>Reject</button>
          <button className="secondary-button" onClick={() => setShowModification((current) => !current)}>Modify sensitivity</button>
          <button className="primary-button" onClick={() => accept(false)}>Accept proposal</button>
        </div>
        {showModification && <div className="modify-box">
          <label>Minimum tumor purity for sensitivity analysis<select value={purityThreshold} onChange={(event) => setPurityThreshold(Number(event.target.value))}><option value={0.45}>0.45 · broader subset</option><option value={0.5}>0.50 · proposed</option><option value={0.6}>0.60 · stricter subset</option></select></label>
          <p>The primary model remains unchanged. Only the prespecified sensitivity subset changes.</p>
          <button className="primary-button" onClick={() => accept(true)}>Accept modification</button>
        </div>}
        {decision === "rejected" && <p className="rejected-note">The proposal is rejected. Nothing will run unless you review and accept a proposal.</p>}
      </section>

      <section className="run-stage">
        <header><div><span>04 · CONTROLLED BROWSER RUN</span><h2>Generate the cohort only after approval.</h2><p>The same seed and accepted settings reproduce the same data and output.</p></div><button className="run-case-button" disabled={running || (decision !== "accepted" && decision !== "modified")} onClick={execute}>{running ? "Generating + calculating…" : run ? "Run again" : "Generate data + run analysis"}<span>▶</span></button></header>
        {!run && !running && <div className="sealed-result"><span>◇</span><strong>Results are sealed</strong><p>Accept the proposal, then run the synthetic analysis. No outcome is displayed in advance.</p></div>}
        {running && <div className="analysis-running" role="status"><span /><div><strong>Executing deterministic protocol</strong><p>Generating 180 samples · calculating 1,200 feature models · applying BH FDR</p></div></div>}
      </section>

      {run && <section className="case-results">
        <header className="results-title"><div><span>05 · EXECUTED OUTPUT</span><h2>Association detected in this synthetic fixture.</h2><p>Executed output is authoritative for this demonstration; the proposal itself was not evidence.</p></div><span className="complete-stamp">RUN COMPLETE</span></header>

        <div className="result-summary-grid">
          <article><span>Adjusted score difference</span><strong>{formatNumber(run.result.primary.response_effect)}</strong><small>standardized score units</small></article>
          <article><span>95% interval</span><strong>{formatNumber(run.result.primary.confidence_low)}–{formatNumber(run.result.primary.confidence_high)}</strong><small>normal approximation</small></article>
          <article><span>Primary p-value</span><strong>{formatP(run.result.primary.p_value)}</strong><small>association test</small></article>
          <article><span>FDR &lt; 0.05</span><strong>{run.result.fdr_significant_features}</strong><small>of {run.result.dataset.feature_count} features</small></article>
        </div>

        <div className="model-comparison">
          <div className="case-section-head"><div><span>MODEL COMPARISON</span><h3>Does the conclusion survive adjustment and filtering?</h3></div><p>The naive estimate is shown to reveal the consequence of ignoring purity and batch; it is not the primary answer.</p></div>
          <div className="table-scroll"><table><thead><tr><th>Model</th><th>n</th><th>Response effect</th><th>95% interval</th><th>p-value</th></tr></thead><tbody><ModelRow model={run.result.naive} /><ModelRow model={run.result.primary} /><ModelRow model={run.result.sensitivity} /></tbody></table></div>
        </div>

        <div className="result-columns">
          <section className="program-results">
            <div className="case-section-head"><div><span>PROGRAM-LEVEL PATTERN</span><h3>Average adjusted feature effects</h3></div></div>
            {run.result.program_summaries.map((program) => <div className="program-row" key={program.program}><div><strong>{program.program}</strong><small>{program.feature_count} features · {program.fdr_significant_features} FDR-significant</small></div><div className="effect-track"><span className={program.mean_response_effect < 0 ? "negative" : ""} style={{ width: `${Math.min(100, Math.abs(program.mean_response_effect) * 120)}%` }} /></div><b>{program.mean_response_effect > 0 ? "+" : ""}{formatNumber(program.mean_response_effect)}</b></div>)}
            <p className="chart-note">Positive values indicate higher expression in synthetic responders after adjustment. These are program summaries, not estimates of cell abundance.</p>
          </section>
          <section className="run-provenance">
            <div className="case-section-head"><div><span>REPRODUCIBILITY</span><h3>Fixed execution record</h3></div></div>
            <dl><div><dt>Execution</dt><dd>{run.result.execution_id}</dd></div><div><dt>Seed</dt><dd>{run.result.seed}</dd></div><div><dt>Metadata checksum</dt><dd>{run.result.hashes.metadata}</dd></div><div><dt>Counts checksum</dt><dd>{run.result.hashes.counts}</dd></div><div><dt>Results checksum</dt><dd>{run.result.hashes.results}</dd></div><div><dt>Checksum type</dt><dd>{run.result.hashes.algorithm}</dd></div></dl>
          </section>
        </div>

        <section className="top-features">
          <div className="case-section-head"><div><span>FEATURE-LEVEL SCREEN</span><h3>Top adjusted results</h3></div><p>Generic identifiers prevent this demonstration from being mistaken for real gene evidence.</p></div>
          <div className="table-scroll"><table><thead><tr><th>Feature</th><th>Program</th><th>Adjusted effect</th><th>Statistic</th><th>p-value</th><th>BH FDR</th></tr></thead><tbody>{run.result.feature_results.slice(0, 10).map((row) => <tr key={row.feature_id}><th>{row.feature_id}</th><td>{row.program}</td><td>{row.response_effect > 0 ? "+" : ""}{formatNumber(row.response_effect, 3)}</td><td>{formatNumber(row.statistic)}</td><td>{formatP(row.p_value)}</td><td>{formatP(row.adjusted_p_value)}</td></tr>)}</tbody></table></div>
        </section>

        <section className="interpretation-boundary">
          <div className="allowed-claim"><span>SUPPORTED WORDING</span><p>“In this synthetic melanoma fixture, the predeclared T-cell-inflamed expression score was higher in synthetic responders after adjustment for age, recorded sex, stage, biopsy site, prior therapy, tumor purity, and batch; the direction persisted in the higher-purity sensitivity subset.”</p></div>
          <div className="blocked-claims"><span>NOT ESTABLISHED</span><ul><li>The program caused response.</li><li>A real patient would benefit from treatment.</li><li>The score is a validated clinical biomarker.</li><li>The expression score measures T-cell abundance.</li></ul></div>
        </section>

        <section className="synthesis-engine">
          <header>
            <div><span>INTERPRETATION ASSISTANCE</span><h3>Evidence synthesis engine</h3><p>Connects executed outputs into a traceable interpretation map. It cannot create new evidence or raise the claim ceiling.</p></div>
            <div className="engine-status"><span>LOCAL RULE ENGINE · ACTIVE</span><b>NEURAL ADAPTER · NOT CONNECTED</b></div>
          </header>
          {!showSynthesis && <div className="engine-gate"><div><strong>What the engine will connect</strong><p>Primary model → covariate impact → purity sensitivity → TME program coherence → contradictions → next decisive analyses.</p></div><button className="primary-button" onClick={() => setShowSynthesis(true)}>Connect the dots <span>→</span></button></div>}
          {showSynthesis && synthesis && <div className="synthesis-output">
            <div className="synthesis-summary"><span>RULE-BASED SYNTHESIS</span><p>{synthesis.summary}</p></div>
            <div className="connection-map">{synthesis.connections.map((connection, index) => <article className={connection.kind} key={connection.id}><div className="connection-index"><span>{connection.id}</span>{index < synthesis.connections.length - 1 && <i />}</div><div><b>{connection.kind.replace("-", " ")}</b><h4>{connection.title}</h4><p>{connection.finding}</p><strong>{connection.implication}</strong><small>Evidence: {connection.evidence_refs.join(" · ")}</small></div></article>)}</div>
            <div className="neural-adapter-note"><span>OPTIONAL CONTROLLED NEURAL ADAPTER</span><p>A future model may explain this structured map in conversational language. It should receive only sanitized summaries, cite these evidence IDs, preserve contradictions, and require researcher approval before any interpretation is saved.</p></div>
          </div>}
        </section>

        <section className="case-downloads">
          <div><span>DOWNLOAD THE COMPLETE EVIDENCE PACKAGE</span><h3>Inspect data, output, decisions, and report.</h3><p>The PDF is a formatted summary. CSV and JSON files remain the machine-readable record.</p></div>
          <div><button onClick={() => downloadText("synthetic-melanoma-metadata.csv", melanomaMetadataCsv(run.dataset), "text/csv")}>Metadata CSV <span>↓</span></button><button onClick={() => downloadText("synthetic-melanoma-counts.csv", melanomaCountsCsv(run.dataset), "text/csv")}>Counts CSV <span>↓</span></button><button onClick={() => downloadText("synthetic-melanoma-results.csv", melanomaResultsCsv(run.result), "text/csv")}>Results CSV <span>↓</span></button><button onClick={() => audit && downloadText("synthetic-melanoma-audit.json", JSON.stringify(audit, null, 2), "application/json")}>Audit JSON <span>↓</span></button><button className="pdf-download" onClick={downloadPdf}>Scientific PDF <span>↓</span></button></div>
        </section>
      </section>}

      <section className="case-sources">
        <div><span>SCIENTIFIC BASIS</span><h2>Why this question and these controls?</h2><p>The literature motivates the demonstration design; it does not validate the generated result.</p></div>
        <div>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5531419/" target="_blank" rel="noreferrer"><strong>Ayers et al., JCI 2017</strong><span>T-cell-inflamed expression and PD-1 response rationale ↗</span></a>
          <a href="https://www.nature.com/articles/ncomms9971" target="_blank" rel="noreferrer"><strong>Aran et al., Nature Communications 2015</strong><span>Why tumor purity can affect transcriptomic comparisons ↗</span></a>
          <a href="https://bioconductor.org/packages/release/bioc/vignettes/edgeR/inst/doc/edgeRUsersGuide.pdf" target="_blank" rel="noreferrer"><strong>edgeR User&apos;s Guide</strong><span>Production count-model recommendation ↗</span></a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3458527/" target="_blank" rel="noreferrer"><strong>Wu &amp; Smyth, Nucleic Acids Research 2012</strong><span>Competitive gene-set testing with correlation adjustment ↗</span></a>
        </div>
      </section>
    </div>
  );
}
