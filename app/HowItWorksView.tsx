type Destination = "overview" | "execution" | "methods";

type HowItWorksViewProps = {
  hasResults: boolean;
  navigate: (view: Destination) => void;
  openPrivacy: () => void;
};

const exampleSteps = [
  {
    number: "01",
    phase: "Question",
    title: "Say exactly what you want to test",
    explanation: "Begin with one answerable comparison. The wording is saved with the run so the result cannot quietly drift into a different scientific claim.",
    example: "Which features differ between Group_B and Group_A after adjustment for Technical_Batch?",
    details: ["You choose the comparison and intended population.", "BioTrust records the question before any result is visible.", "This question tests association; it does not establish causation or mechanism."],
  },
  {
    number: "02",
    phase: "Inputs",
    title: "Choose data inside a controlled boundary",
    explanation: "The public example uses a fixed synthetic count matrix and synthetic sample table. A connected real-data runner accepts only authorized CSV files and validates them before analysis.",
    example: "Synthetic_Cohort · 120 samples · 12,000 features · Group_A and Group_B",
    details: ["Sample identifiers must match exactly across both files.", "Count values must be non-negative integers within declared limits.", "Input hashes identify the exact files without exposing their contents in the report."],
  },
  {
    number: "03",
    phase: "Method",
    title: "Use a method that matches the question",
    explanation: "Select from an allowlisted method rather than sending arbitrary code. Every method has a card describing its purpose, assumptions, failure modes, alternatives, and validation checks.",
    example: "edgeR quasi-likelihood · replicated RNA-seq counts · negative-binomial model",
    details: ["Low-expression features are filtered before modeling.", "Library composition is normalized with a declared procedure.", "DESeq2 can be selected as an alternative controlled workflow."],
  },
  {
    number: "04",
    phase: "Plan",
    title: "Review the exact request before execution",
    explanation: "BioTrust turns your choices into one readable plan. Nothing runs until you confirm the comparison, reference, covariates, formula, and multiple-testing rule.",
    example: "Design: ~ Technical_Batch + condition · Contrast: Group_B vs Group_A · BH FDR",
    details: ["The comparison direction is shown explicitly.", "No covariate is added or removed silently.", "Changing any field clears confirmation and requires a fresh review."],
  },
  {
    number: "05",
    phase: "Run and review",
    title: "Execute, validate, and expose limitations",
    explanation: "The controlled runner executes the approved plan, records software versions and hashes, and returns a structured result. Warnings remain attached to the run and its claims.",
    example: "8,421 of 12,000 features retained · six preview rows · deterministic synthetic output",
    details: ["Raw and adjusted p-values remain separate.", "A result can support a data statement without supporting a causal interpretation.", "The visible decision trail explains each recorded choice and check."],
  },
  {
    number: "06",
    phase: "Record",
    title: "Download evidence, not just a chart",
    explanation: "A completed run unlocks the result table, claim review, provenance record, and downloads. Before a run, these areas intentionally remain empty.",
    example: "Scientific PDF · complete results CSV · machine-readable audit JSON",
    details: ["The PDF includes the question, plan, checks, results, limitations, and hashes.", "The CSV contains the complete result table for further review.", "The JSON preserves the structured audit record for reproducibility."],
  },
];

export default function HowItWorksView({ hasResults, navigate, openPrivacy }: HowItWorksViewProps) {
  return (
    <div className="view how-view">
      <section className="how-hero">
        <div className="how-hero-copy">
          <span className="page-kicker">Start here</span>
          <h1>Understand the analysis before you run it.</h1>
          <p>BioTrust turns a research question into a controlled, reviewable analysis. You approve the scientific choices, the runner executes only the confirmed plan, and the result arrives with its evidence trail and limitations.</p>
          <div className="how-actions">
            <button className="primary-button" onClick={() => navigate("execution")}>{hasResults ? "Open completed example" : "Try the synthetic example"} <span>→</span></button>
            <button className="secondary-button" onClick={() => navigate("overview")}>Open workspace</button>
          </div>
        </div>
        <aside className="how-example-summary" aria-label="Guided example summary">
          <span>Guided example</span>
          <h2>Group_B versus Group_A</h2>
          <p>A synthetic RNA-seq comparison that shows the complete workflow without using real research data.</p>
          <dl>
            <div><dt>Dataset</dt><dd>Synthetic_Cohort</dd></div>
            <div><dt>Method</dt><dd>edgeR quasi-likelihood</dd></div>
            <div><dt>Adjustment</dt><dd>Technical_Batch</dd></div>
            <div><dt>Outputs</dt><dd>PDF · CSV · JSON</dd></div>
          </dl>
        </aside>
      </section>

      <section className="how-flow" aria-label="Analysis flow">
        {["Define question", "Choose inputs", "Review method", "Confirm plan", "Run and inspect", "Download record"].map((label, index) => <div key={label}><span>{index + 1}</span><strong>{label}</strong>{index < 5 && <i>→</i>}</div>)}
      </section>

      <section className="how-intro">
        <div><span className="page-kicker">One complete example</span><h2>Follow the work from question to report</h2></div>
        <p>Each stage below separates what you decide, what BioTrust checks, and what becomes part of the permanent analysis record.</p>
      </section>

      <ol className="how-steps">
        {exampleSteps.map((step) => (
          <li className="how-step" key={step.number}>
            <div className="how-step-number">{step.number}</div>
            <div className="how-step-copy">
              <span>{step.phase}</span>
              <h2>{step.title}</h2>
              <p>{step.explanation}</p>
              <div className="how-example"><strong>Example</strong><code>{step.example}</code></div>
            </div>
            <ul>{step.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
          </li>
        ))}
      </ol>

      <section className="how-boundary">
        <div><span className="page-kicker">Data boundary</span><h2>What happens online and what requires a runner</h2><p>The public GitHub Pages site can execute the fixed synthetic demonstration in your browser. Real datasets require a connected, authenticated computation service; the static site does not upload or process them by itself.</p><button className="text-button" onClick={openPrivacy}>Inspect the privacy boundary <span>→</span></button></div>
        <div className="how-boundary-options"><article><span>Available now</span><strong>Public synthetic demonstration</strong><p>No login, no real data, fixed generic values, complete report downloads.</p></article><article><span>Requires setup</span><strong>Controlled real-data execution</strong><p>Authorized CSV inputs, isolated runner, input validation, temporary processing, and hashed outputs.</p></article></div>
      </section>

      <section className="how-guardrails">
        <article><span>BioTrust will</span><h3>Keep choices visible</h3><p>Questions, methods, contrasts, covariates, checks, warnings, versions, and hashes stay inspectable.</p></article>
        <article><span>BioTrust will not</span><h3>Turn association into causation</h3><p>Results are classified conservatively. Hypotheses and unsupported claims remain visibly distinct from data statements.</p></article>
        <article><span>The researcher must</span><h3>Approve and interpret</h3><p>You confirm the plan, decide whether a claim is appropriate, and determine whether further validation is required.</p></article>
      </section>

      <section className="how-next">
        <div><span className="page-kicker">Ready to try it?</span><h2>Run the example, then inspect what was recorded.</h2><p>Results stay hidden until you explicitly start the synthetic analysis.</p></div>
        <div><button className="secondary-button" onClick={() => navigate("methods")}>Browse methods</button><button className="primary-button" onClick={() => navigate("execution")}>Go to Run analysis <span>→</span></button></div>
      </section>
    </div>
  );
}
