type Destination = "example" | "analyze";

type HowItWorksViewProps = {
  hasResults: boolean;
  navigate: (view: Destination) => void;
  openPrivacy: () => void;
};

const workflow = [
  ["01", "Choose a starting point", "Open the single worked Example, or load your own count matrix and sample metadata in Analyze your data."],
  ["02", "Inspect before testing", "BioTrust checks dimensions, sample matching, count structure, library sizes, group candidates, and available covariates before it offers a Run button."],
  ["03", "Define the question", "You select the condition, comparison and reference levels, covariates, and write the scientific question the analysis must answer."],
  ["04", "Choose and confirm methods", "Select one or several JavaScript or genuine R methods. Guidance explains which choices match the declared question and where each method stops."],
  ["05", "Run, compare, and export", "Only confirmed methods run. Results, method comparison, interpretation boundaries, CSV, audit JSON, and PDF stay together."],
];

const responsibilities = [
  ["BIOTRUST INSPECTS", "Data type, dimensions, group replication, covariate complexity, and method prerequisites."],
  ["AI GUIDE SUGGESTS", "Question-matched methods, useful comparisons, limitations, and analyses that should remain separate."],
  ["RESEARCHER CHOOSES", "The files, question, contrast, covariates, methods, and final confirmation."],
  ["ENGINE EXECUTES", "Only the approved analyses. JavaScript and webR methods run in the browser; count-native edgeR and DESeq2 remain inside the controlled R runner."],
];

export default function HowItWorksView({ hasResults, navigate, openPrivacy }: HowItWorksViewProps) {
  return <div className="view protocol-view how-current-view">
    <section className="protocol-hero how-hero-simple"><div><span className="page-kicker">How BioTrust works</span><h1>Understand the data, choose the method, then run exactly what you approved.</h1><p>BioTrust turns a scientific question into visible choices. It profiles the files first, explains the consequences of each method, and never presents an unselected analysis as evidence.</p><div className="how-actions"><button className="primary-button" onClick={() => navigate("example")}>Open Example <span>→</span></button><button className="secondary-button" onClick={() => navigate("analyze")}>Analyze your data</button></div></div><aside className="protocol-scope"><span>ONE BUILT-IN EXAMPLE</span><dl><div><dt>Study</dt><dd>Synthetic melanoma RNA-seq</dd></div><div><dt>Samples</dt><dd>180 baseline tumors</dd></div><div><dt>Features</dt><dd>1,200 synthetic IDs</dd></div><div><dt>Methods</dt><dd>JavaScript + genuine R</dd></div><div><dt>Purpose</dt><dd>Question-to-result walkthrough</dd></div><div><dt>Results</dt><dd>{hasResults ? "Run completed this session" : "Hidden until you run"}</dd></div></dl><button onClick={openPrivacy}>Inspect computation boundary <span>→</span></button></aside></section>
    <section className="protocol-section-head"><div><span className="page-kicker">Complete path</span><h2>One clear workflow from inspection to evidence.</h2></div><p>How it works always opens first. The next page, Example, contains the dataset, selectable plan, Run control, results, interpretation, and downloads together.</p></section>
    <section className="how-workflow-grid">{workflow.map(([number, title, detail]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</section>
    <section className="how-responsibility"><header><span>WHO CONTROLS WHAT</span><h2>Suggestion is never confused with authorization.</h2></header><div>{responsibilities.map(([title, detail]) => <article key={title}><strong>{title}</strong><p>{detail}</p></article>)}</div></section>
    <section className="protocol-execution-map"><div><span className="page-kicker">Honest execution boundary</span><h2>What GitHub Pages can genuinely run.</h2><p>Both the Example and uploaded-data workflow can run deterministic JavaScript methods and real R stats functions through webR. Neither is mislabeled as edgeR or DESeq2.</p></div><dl><div><dt>Load and inspect CSV / TSV data</dt><dd className="available">AVAILABLE</dd></div><div><dt>JavaScript adjusted / Welch / Wilcoxon</dt><dd className="available">AVAILABLE</dd></div><div><dt>R stats adjusted / Welch / Wilcoxon</dt><dd className="available">AVAILABLE</dd></div><div><dt>Compare selected methods</dt><dd className="available">AVAILABLE</dd></div><div><dt>PDF, CSV, and audit export</dt><dd className="available">AVAILABLE</dd></div><div><dt>edgeR / DESeq2 on real data</dt><dd>CONTROLLED RUNNER</dd></div></dl></section>
    <section className="how-next"><div><span className="page-kicker">Choose your path</span><h2>Learn once, then analyze your own study.</h2><p>Example is the only built-in demonstration. Analyze your data is the working file-based path.</p></div><div><button className="secondary-button" onClick={() => navigate("example")}>Open Example</button><button className="primary-button" onClick={() => navigate("analyze")}>Analyze your data <span>→</span></button></div></section>
  </div>;
}
