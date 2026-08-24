type Destination = "overview" | "analysis" | "execution" | "methods";

type HowItWorksViewProps = {
  hasResults: boolean;
  navigate: (view: Destination) => void;
  openPrivacy: () => void;
};

const analysisBranches = [
  {
    id: "P1",
    role: "Primary estimand",
    question: "Is Exposure_A associated with genome-wide expression within Tissue_A after adjustment for Technical_Batch?",
    method: "edgeR quasi-likelihood",
    specification: "~ Technical_Batch + Exposure_A",
    decision: "BH FDR ≤ 0.05; retain effect direction and magnitude",
    ceiling: "Adjusted association only",
  },
  {
    id: "S1",
    role: "Model sensitivity",
    question: "Are the primary effect directions and rankings stable under an alternative count-aware model?",
    method: "DESeq2 Wald test",
    specification: "Same population, design, contrast, and test family as P1",
    decision: "Report sign concordance, rank concordance, and material reversals",
    ceiling: "Robustness support; not replication",
  },
  {
    id: "C1",
    role: "Cross-phenotype concordance",
    question: "Does the Exposure_A expression pattern resemble the separate pattern associated with Clinical_Score?",
    method: "Spearman correlation",
    specification: "Signed statistics from P1 versus a pre-specified Clinical_Score model",
    decision: "Correlation with uncertainty and influential-feature review",
    ceiling: "Shared pattern; not mediation or causation",
  },
  {
    id: "G1",
    role: "Gene-set interpretation",
    question: "Are Cell_State_A genes collectively shifted relative to the declared gene universe?",
    method: "cameraPR",
    specification: "Pre-registered set, matched identifiers, explicit gene universe",
    decision: "Competitive set test with multiplicity across tested sets",
    ceiling: "Gene-set shift; not measured cell abundance",
  },
  {
    id: "V1",
    role: "Internal validation",
    question: "Can a fixed Exposure_A molecular score recover the exposure in held-out synthetic samples?",
    method: "Repeated 5-fold CV",
    specification: "All feature selection and scaling repeated inside each training fold",
    decision: "Held-out performance with fold hashes and leakage checks",
    ceiling: "Internal predictive support; not external replication",
  },
];

const decisionGates = [
  { id: "GATE 01", title: "Population and design integrity", check: "Sample alignment, group replication, missingness, design rank, and Exposure_A–Technical_Batch overlap.", stop: "Stop if the intended contrast is not identifiable." },
  { id: "GATE 02", title: "Primary model adequacy", check: "Count scale, library composition, low-expression filtering, dispersion trend, and influential samples.", stop: "Revise the plan before inspecting discovery claims." },
  { id: "GATE 03", title: "Multiplicity contract", check: "One declared genome-wide family for P1 and a separate declared family for gene-set tests.", stop: "Do not promote raw p-values or redefine families after seeing results." },
  { id: "GATE 04", title: "Robustness and concordance", check: "Alternative model, batch sensitivity, sign reversals, rank stability, and influential-feature diagnostics.", stop: "Downgrade claims when conclusions depend on one specification." },
  { id: "GATE 05", title: "Claim classification", check: "Separate DATA, INFERENCE, and HYPOTHESIS statements and attach the unresolved limitations.", stop: "Block causal, mediation, abundance, and replication language unless directly supported." },
];

const architecture = [
  ["01", "Cohort contract", "Tissue_A population, authorized inputs, exact sample matching"],
  ["02", "Primary estimand", "Exposure_A coefficient under the locked adjustment set"],
  ["03", "Sensitivity", "Alternative model and specification-dependence checks"],
  ["04", "Integration", "Clinical_Score concordance and Cell_State_A set testing"],
  ["05", "Claim contract", "Evidence class, wording ceiling, limitations, provenance"],
];

export default function HowItWorksView({ hasResults, navigate, openPrivacy }: HowItWorksViewProps) {
  return (
    <div className="view protocol-view">
      <section className="protocol-header">
        <div className="protocol-meta"><span>PROTOCOL</span><strong>EX-A01</strong><i>·</i><span>VERSION</span><strong>1.0</strong><i>·</i><span>DATA</span><strong>SYNTHETIC ONLY</strong></div>
        <span className="protocol-status">DESIGN REVIEW</span>
      </section>

      <section className="protocol-hero">
        <div>
          <span className="page-kicker">Worked research protocol</span>
          <h1>Resolve a complex question into testable parts.</h1>
          <p className="protocol-question">Within <strong>Tissue_A</strong>, is <strong>Exposure_A</strong> associated with a reproducible expression program after adjustment for <strong>Technical_Batch</strong>, and is that program concordant with the separate <strong>Clinical_Score</strong> association without claiming causation, mediation, or cell abundance?</p>
          <div className="how-actions"><button className="primary-button" onClick={() => navigate("analysis")}>Inspect the protocol <span>→</span></button><button className="secondary-button" onClick={() => navigate("execution")}>{hasResults ? "Review synthetic run" : "Run primary branch"}</button></div>
        </div>
        <aside className="protocol-scope">
          <span>Scientific scope</span>
          <dl>
            <div><dt>Population</dt><dd>Tissue_A samples</dd></div>
            <div><dt>Primary exposure</dt><dd>Exposure_A</dd></div>
            <div><dt>Primary outcome</dt><dd>Genome-wide expression</dd></div>
            <div><dt>Adjustment</dt><dd>Technical_Batch</dd></div>
            <div><dt>Linked analyses</dt><dd>5 registered branches</dd></div>
            <div><dt>Inference ceiling</dt><dd>Association</dd></div>
          </dl>
          <button onClick={openPrivacy}>Inspect computation boundary <span>→</span></button>
        </aside>
      </section>

      <section className="protocol-architecture" aria-label="Protocol architecture">
        {architecture.map(([number, title, detail]) => <article key={number}><span>{number}</span><div><strong>{title}</strong><p>{detail}</p></div></article>)}
      </section>

      <section className="protocol-section-head">
        <div><span className="page-kicker">Question decomposition</span><h2>One question becomes five linked analyses</h2></div>
        <p>The primary estimand remains authoritative. Secondary branches test robustness, compare patterns, narrow interpretation, and validate prediction; they do not silently change the original question.</p>
      </section>

      <section className="protocol-ledger" aria-label="Registered analysis branches">
        <header><span>ID / ROLE</span><span>SCIENTIFIC QUESTION</span><span>METHOD / SPECIFICATION</span><span>DECISION / CLAIM CEILING</span></header>
        {analysisBranches.map((branch) => <article key={branch.id}>
          <div><b>{branch.id}</b><small>{branch.role}</small></div>
          <p>{branch.question}</p>
          <div><strong>{branch.method}</strong><code>{branch.specification}</code></div>
          <div><strong>{branch.decision}</strong><small>{branch.ceiling}</small></div>
        </article>)}
      </section>

      <section className="protocol-two-column">
        <div>
          <div className="protocol-section-head compact"><div><span className="page-kicker">Decision logic</span><h2>Evidence gates before interpretation</h2></div></div>
          <div className="decision-gates">{decisionGates.map((gate) => <article key={gate.id}><span>{gate.id}</span><div><h3>{gate.title}</h3><p>{gate.check}</p><small><b>Escalation:</b> {gate.stop}</small></div></article>)}</div>
        </div>
        <aside className="protocol-contract">
          <span className="page-kicker">Claim contract</span>
          <h2>What the completed program may say</h2>
          <div className="claim-allowed"><span>ALLOWABLE IF SUPPORTED</span><p>“Exposure_A is associated with a differential expression pattern in Tissue_A after the declared adjustment.”</p><p>“The signed pattern is concordant with the separate Clinical_Score association.”</p><p>“Cell_State_A genes show a competitive gene-set shift.”</p></div>
          <div className="claim-blocked"><span>NOT ESTABLISHED</span><p>Exposure_A causes the expression pattern.</p><p>Exposure_A mediates the Clinical_Score association.</p><p>Gene-set enrichment measures Cell_State_A abundance.</p><p>Internal cross-validation is external replication.</p></div>
        </aside>
      </section>

      <section className="protocol-execution-map">
        <div><span className="page-kicker">Execution coverage</span><h2>What the public demonstration actually runs</h2><p>The current GitHub Pages demonstration executes the fixed synthetic <strong>P1 primary branch</strong> and produces its PDF, CSV, audit JSON, and decision trail. The full linked protocol is represented in the planning and evidence model; additional branches require controlled adapters rather than simulated results.</p></div>
        <dl><div><dt>P1 primary branch</dt><dd className="available">AVAILABLE</dd></div><div><dt>S1 alternative model</dt><dd>ADAPTER REQUIRED</dd></div><div><dt>C1 / G1 / V1</dt><dd>ADAPTER REQUIRED</dd></div><div><dt>Real research files</dt><dd>SECURE RUNNER REQUIRED</dd></div></dl>
      </section>

      <section className="how-next">
        <div><span className="page-kicker">Next action</span><h2>Review the protocol before running the primary branch.</h2><p>No synthetic result is shown until you explicitly execute it.</p></div>
        <div><button className="secondary-button" onClick={() => navigate("methods")}>Inspect methods</button><button className="primary-button" onClick={() => navigate("analysis")}>Open analysis protocol <span>→</span></button></div>
      </section>
    </div>
  );
}
