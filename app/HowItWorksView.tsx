type Destination = "example" | "analyze";

type HowItWorksViewProps = {
  hasResults: boolean;
  navigate: (view: Destination) => void;
  openPrivacy: () => void;
};

const workflow = [
  ["01", "Load the built-in Example files", "The Example already contains a count matrix and sample metadata. One button loads both files; you do not upload anything."],
  ["02", "Explore automatically", "Immediately after loading, BioTrust checks dimensions, count structure, library sizes, response groups, clinical variables, and technical covariates without testing the scientific outcome."],
  ["03", "Review the research question", "The Example declares the response comparison and seven covariates so you can see exactly what each method would need to answer."],
  ["04", "Choose analyses and methods", "Every JavaScript method, R method, biological summary, sensitivity analysis, and neural option is directly selectable after exploration."],
  ["05", "Confirm, run, compare, and export", "Only the selected choices run. Results, method comparison, interpretation boundaries, CSV, audit JSON, and PDF stay together."],
];

const responsibilities = [
  ["BIOTRUST INSPECTS", "Data type, dimensions, group replication, covariate complexity, and method prerequisites."],
  ["AI GUIDE SUGGESTS", "Question-matched methods, useful comparisons, limitations, and analyses that should remain separate."],
  ["RESEARCHER CHOOSES", "The files, question, contrast, covariates, methods, and final confirmation."],
  ["ENGINE EXECUTES", "Only the approved analyses. JavaScript and webR methods run in the browser; count-native edgeR and DESeq2 remain inside the controlled R runner."],
];

export default function HowItWorksView({ hasResults, navigate, openPrivacy }: HowItWorksViewProps) {
  return <div className="view protocol-view how-current-view">
    <section className="protocol-hero how-hero-simple"><div><span className="page-kicker">How BioTrust works</span><h1>Load the study, inspect it automatically, then choose exactly what runs.</h1><p>The Example starts with two files already bundled on the platform. BioTrust loads them together, completes a descriptive exploration, and only then opens the analysis and method choices.</p><div className="how-actions"><button className="primary-button" onClick={() => navigate("example")}>Open Example <span>→</span></button><button className="secondary-button" onClick={() => navigate("analyze")}>Analyze your data</button></div></div><aside className="protocol-scope"><span>ONE BUILT-IN EXAMPLE</span><dl><div><dt>Study</dt><dd>Synthetic melanoma RNA-seq</dd></div><div><dt>Files</dt><dd>Counts + sample metadata</dd></div><div><dt>Samples</dt><dd>180 baseline tumors</dd></div><div><dt>Features</dt><dd>1,200 synthetic IDs</dd></div><div><dt>Methods</dt><dd>JavaScript + genuine R</dd></div><div><dt>Results</dt><dd>{hasResults ? "Run completed this session" : "Hidden until you run"}</dd></div></dl><button onClick={openPrivacy}>Inspect computation boundary <span>→</span></button></aside></section>
    <section className="protocol-section-head"><div><span className="page-kicker">Complete path</span><h2>One clear workflow from inspection to evidence.</h2></div><p>How it works always opens first. The next page, Example, contains the dataset, selectable plan, Run control, results, interpretation, and downloads together.</p></section>
    <section className="how-workflow-grid">{workflow.map(([number, title, detail]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</section>
    <section className="how-responsibility"><header><span>WHO CONTROLS WHAT</span><h2>Suggestion is never confused with authorization.</h2></header><div>{responsibilities.map(([title, detail]) => <article key={title}><strong>{title}</strong><p>{detail}</p></article>)}</div></section>
    <section className="protocol-execution-map"><div><span className="page-kicker">Honest execution boundary</span><h2>What GitHub Pages can genuinely run.</h2><p>Both the Example and uploaded-data workflow can run deterministic JavaScript methods and real R stats functions through webR. Neither is mislabeled as edgeR or DESeq2.</p></div><dl><div><dt>Load and inspect CSV / TSV data</dt><dd className="available">AVAILABLE</dd></div><div><dt>JavaScript adjusted / Welch / Wilcoxon</dt><dd className="available">AVAILABLE</dd></div><div><dt>R stats adjusted / Welch / Wilcoxon</dt><dd className="available">AVAILABLE</dd></div><div><dt>Compare selected methods</dt><dd className="available">AVAILABLE</dd></div><div><dt>PDF, CSV, and audit export</dt><dd className="available">AVAILABLE</dd></div><div><dt>edgeR / DESeq2 on real data</dt><dd>CONTROLLED RUNNER</dd></div></dl></section>
    <section className="how-next"><div><span className="page-kicker">Choose your path</span><h2>Learn once, then analyze your own study.</h2><p>Example is the only built-in demonstration. Analyze your data is the working file-based path.</p></div><div><button className="secondary-button" onClick={() => navigate("example")}>Open Example</button><button className="primary-button" onClick={() => navigate("analyze")}>Analyze your data <span>→</span></button></div></section>
  </div>;
}
