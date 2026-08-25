type Destination = "overview" | "example" | "analysis" | "execution" | "controlled" | "methods";

type HowItWorksViewProps = {
  hasResults: boolean;
  navigate: (view: Destination) => void;
  openPrivacy: () => void;
};

const workflow = [
  ["01", "Understand the data", "BioTrust profiles the matrix, sample groups, library sizes, missing structure, tumor purity, clinical composition, and technical batches before suggesting a method."],
  ["02", "State the question", "The researcher defines the population, outcome, contrast, covariates, and the scientific claim they are trying to support."],
  ["03", "Choose analyses", "The researcher selects feature-level DGE, TME program summaries, purity sensitivity, neural integration, or any combination."],
  ["04", "Choose methods", "For browser DGE, the researcher can run Adjusted OLS, Welch, Wilcoxon, or several methods on the same data for direct comparison."],
  ["05", "Review AI guidance", "The local method guide explains which choice matches the question, where covariate adjustment matters, and why agreement is not replication."],
  ["06", "Confirm and run", "Only the confirmed modules and methods execute. Results remain hidden until the researcher presses Run analysis."],
  ["07", "Compare and connect", "BioTrust shows method agreement and disagreement, program patterns, sensitivity results, and neural prediction without merging different evidence classes."],
  ["08", "Export the trail", "The data, selected-method results, researcher plan, audit JSON, and PDF record can be downloaded for review."],
];

const responsibilities = [
  ["BIOTRUST INSPECTS", "Data type, dimensions, group replication, covariate complexity, and method prerequisites."],
  ["AI GUIDE SUGGESTS", "Question-matched methods, useful comparisons, limitations, and analyses that should remain separate."],
  ["RESEARCHER CHOOSES", "The question, analysis modules, DGE methods, comparison depth, purity threshold, and final confirmation."],
  ["ENGINE EXECUTES", "Only the approved browser analyses; count-native edgeR and DESeq2 remain inside the controlled R runner."],
];

export default function HowItWorksView({ hasResults, navigate, openPrivacy }: HowItWorksViewProps) {
  return <div className="view protocol-view how-current-view">
    <section className="protocol-hero how-hero-simple"><div><span className="page-kicker">How BioTrust works</span><h1>The AI advises. The researcher decides. The engine records what actually ran.</h1><p>BioTrust is not a one-click answer generator. It turns a scientific question into visible choices, explains the consequences, and prevents unselected analyses from appearing as evidence.</p><div className="how-actions"><button className="primary-button" onClick={() => navigate("example")}>See the melanoma example <span>→</span></button><button className="secondary-button" onClick={() => navigate("analysis")}>Build an analysis plan</button></div></div><aside className="protocol-scope"><span>CURRENT ONLINE EXAMPLE</span><dl><div><dt>Dataset</dt><dd>Synthetic melanoma RNA-seq</dd></div><div><dt>Samples</dt><dd>180 baseline tumors</dd></div><div><dt>Features</dt><dd>1,200 synthetic IDs</dd></div><div><dt>DGE choices</dt><dd>3 browser methods</dd></div><div><dt>Other analyses</dt><dd>Programs, purity, neural</dd></div><div><dt>Results</dt><dd>{hasResults ? "Run completed this session" : "Hidden until execution"}</dd></div></dl><button onClick={openPrivacy}>Inspect computation boundary <span>→</span></button></aside></section>
    <section className="protocol-section-head"><div><span className="page-kicker">Complete path</span><h2>One clear workflow from inspection to evidence.</h2></div><p>The melanoma page is only the worked Example. Method selection happens in Analysis plan, and execution happens in Run analysis.</p></section>
    <section className="how-workflow-grid">{workflow.map(([number, title, detail]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</section>
    <section className="how-responsibility"><header><span>WHO CONTROLS WHAT</span><h2>Suggestion is never confused with authorization.</h2></header><div>{responsibilities.map(([title, detail]) => <article key={title}><strong>{title}</strong><p>{detail}</p></article>)}</div></section>
    <section className="protocol-execution-map"><div><span className="page-kicker">Honest execution boundary</span><h2>What the public page can genuinely run.</h2><p>All listed browser modules execute deterministically on the synthetic melanoma cohort. The site does not label a JavaScript approximation as edgeR or DESeq2.</p></div><dl><div><dt>Adjusted log-CPM DGE</dt><dd className="available">AVAILABLE</dd></div><div><dt>Welch / Wilcoxon DGE</dt><dd className="available">AVAILABLE</dd></div><div><dt>Multi-method comparison</dt><dd className="available">AVAILABLE</dd></div><div><dt>TME program summary</dt><dd className="available">AVAILABLE</dd></div><div><dt>Purity sensitivity</dt><dd className="available">AVAILABLE</dd></div><div><dt>Five-fold neural integration</dt><dd className="available">AVAILABLE</dd></div><div><dt>edgeR / DESeq2 on real data</dt><dd>CONTROLLED RUNNER</dd></div></dl></section>
    <section className="how-next"><div><span className="page-kicker">Next action</span><h2>Understand the example, then choose your own plan.</h2><p>The Example page never executes results. Your confirmed Analysis plan controls Run analysis.</p></div><div><button className="secondary-button" onClick={() => navigate("methods")}>Inspect method library</button><button className="primary-button" onClick={() => navigate("example")}>Open Example <span>→</span></button></div></section>
  </div>;
}
