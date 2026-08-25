type Destination = "example" | "controlled" | "methods";

type HowItWorksViewProps = {
  hasResults: boolean;
  navigate: (view: Destination) => void;
  openPrivacy: () => void;
};

const workflow = [
  ["01", "Understand the data", "BioTrust profiles the matrix, sample groups, library sizes, missing structure, tumor purity, clinical composition, and technical batches before suggesting a method."],
  ["02", "State the question", "The researcher defines the population, outcome, contrast, covariates, and the scientific claim they are trying to support."],
  ["03", "Choose analyses", "The researcher selects feature-level DGE, TME program summaries, purity sensitivity, neural integration, or any combination."],
  ["04", "Choose methods", "On the Example page, the researcher can select JavaScript DGE methods, genuine R stats package functions, or both on the same data."],
  ["05", "Review AI guidance", "The local method guide explains which choice matches the question, where covariate adjustment matters, and why agreement is not replication."],
  ["06", "Confirm and run", "Only the confirmed modules and methods execute. Results remain hidden until the researcher presses Run analysis."],
  ["07", "Compare and connect", "BioTrust shows method agreement and disagreement, program patterns, sensitivity results, and neural prediction without merging different evidence classes."],
  ["08", "Export the trail", "The data, selected-method results, researcher plan, audit JSON, and PDF record can be downloaded for review."],
];

const responsibilities = [
  ["BIOTRUST INSPECTS", "Data type, dimensions, group replication, covariate complexity, and method prerequisites."],
  ["AI GUIDE SUGGESTS", "Question-matched methods, useful comparisons, limitations, and analyses that should remain separate."],
  ["RESEARCHER CHOOSES", "The question, analysis modules, DGE methods, comparison depth, purity threshold, and final confirmation."],
  ["ENGINE EXECUTES", "Only the approved analyses. JavaScript and webR methods run in the browser; count-native edgeR and DESeq2 remain inside the controlled R runner."],
];

export default function HowItWorksView({ hasResults, navigate, openPrivacy }: HowItWorksViewProps) {
  return <div className="view protocol-view how-current-view">
    <section className="protocol-hero how-hero-simple"><div><span className="page-kicker">How BioTrust works</span><h1>The AI advises. The researcher decides. The engine records what actually ran.</h1><p>BioTrust is not a one-click answer generator. It turns a scientific question into visible choices, explains the consequences, and prevents unselected analyses from appearing as evidence.</p><div className="how-actions"><button className="primary-button" onClick={() => navigate("example")}>Open the interactive Example <span>→</span></button></div></div><aside className="protocol-scope"><span>CURRENT ONLINE EXAMPLE</span><dl><div><dt>Dataset</dt><dd>Synthetic melanoma RNA-seq</dd></div><div><dt>Samples</dt><dd>180 baseline tumors</dd></div><div><dt>Features</dt><dd>1,200 synthetic IDs</dd></div><div><dt>Execution choices</dt><dd>JavaScript + genuine R</dd></div><div><dt>Other analyses</dt><dd>Programs, purity, neural</dd></div><div><dt>Results</dt><dd>{hasResults ? "Run completed this session" : "Hidden until you run"}</dd></div></dl><button onClick={openPrivacy}>Inspect computation boundary <span>→</span></button></aside></section>
    <section className="protocol-section-head"><div><span className="page-kicker">Complete path</span><h2>One clear workflow from inspection to evidence.</h2></div><p>How it works always opens first. The next page, Example, contains the dataset, selectable plan, Run control, results, interpretation, and downloads together.</p></section>
    <section className="how-workflow-grid">{workflow.map(([number, title, detail]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</section>
    <section className="how-responsibility"><header><span>WHO CONTROLS WHAT</span><h2>Suggestion is never confused with authorization.</h2></header><div>{responsibilities.map(([title, detail]) => <article key={title}><strong>{title}</strong><p>{detail}</p></article>)}</div></section>
    <section className="protocol-execution-map"><div><span className="page-kicker">Honest execution boundary</span><h2>What the public page can genuinely run.</h2><p>The Example runs both deterministic TypeScript methods and real R stats package functions through webR. It does not label either transformed-count approach as edgeR or DESeq2.</p></div><dl><div><dt>JavaScript adjusted / Welch / Wilcoxon</dt><dd className="available">AVAILABLE</dd></div><div><dt>R stats adjusted / Welch / Wilcoxon</dt><dd className="available">AVAILABLE</dd></div><div><dt>Versioned R result export</dt><dd className="available">AVAILABLE</dd></div><div><dt>TME program summary</dt><dd className="available">AVAILABLE</dd></div><div><dt>Purity sensitivity</dt><dd className="available">AVAILABLE</dd></div><div><dt>Five-fold neural integration</dt><dd className="available">AVAILABLE</dd></div><div><dt>edgeR / DESeq2 on real data</dt><dd>CONTROLLED RUNNER</dd></div></dl></section>
    <section className="how-next"><div><span className="page-kicker">Next action</span><h2>Open Example and make the choices yourself.</h2><p>Selection, confirmation, Run, results, and downloads now stay together on one page.</p></div><div><button className="secondary-button" onClick={() => navigate("methods")}>Inspect method library</button><button className="primary-button" onClick={() => navigate("example")}>Open Example <span>→</span></button></div></section>
  </div>;
}
