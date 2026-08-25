import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/BioTrustApp.tsx", import.meta.url), "utf8");
const viewSource = await readFile(new URL("../app/AnalyzeDataView.tsx", import.meta.url), "utf8");
const analysisSource = await readFile(new URL("../app/userDataAnalysis.ts", import.meta.url), "utf8");

function executeUploadedFixture() {
  const moduleUrl = new URL("../app/userDataAnalysis.ts", import.meta.url).href;
  const expression = `import(${JSON.stringify(moduleUrl)}).then(async (m) => {
    const samples = Array.from({ length: 8 }, (_, index) => "S" + (index + 1));
    const counts = [["feature_id", ...samples].join(","), ...Array.from({ length: 20 }, (_, feature) => ["G" + (feature + 1), ...samples.map((_, sample) => 20 + feature + (sample >= 4 && feature < 4 ? 18 : 0) + sample % 3)].join(","))].join("\\n");
    const metadata = ["sample_id,group,batch,age", ...samples.map((sample, index) => sample + "," + (index < 4 ? "A" : "B") + "," + (index % 2 ? "B2" : "B1") + "," + (42 + index * 3))].join("\\n");
    const dataset = m.parseUserDataset(counts, metadata, "counts.csv", "metadata.csv");
    const setup = { question: "Which features differ between B and A after batch and age?", conditionColumn: "group", referenceLevel: "A", comparisonLevel: "B", covariates: ["batch", "age"], methods: ["js_adjusted_ols", "r_adjusted_ols"] };
    const output = await m.runUserAnalysis(dataset, setup);
    console.log(JSON.stringify({ samples: dataset.summary.samples, features: dataset.summary.features, integer: dataset.summary.integerNonnegative, categorical: dataset.categoricalColumns, runs: output.runs.map((run) => ({ id: run.method.id, rows: run.results.length, software: run.software })), comparisons: output.comparisons.length, resultCsv: m.userResultsCsv(output).split("\\n").length }));
    process.exit(0);
  }).catch((error) => { console.error(error); process.exit(1); });`;
  return JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", expression], { encoding: "utf8", timeout: 30000 }));
}

test("keeps the public product to three clear destinations", () => {
  assert.match(appSource, /label: "How it works"/);
  assert.match(appSource, /label: "Example"/);
  assert.match(appSource, /label: "Analyze your data"/);
  assert.doesNotMatch(appSource, /label: "Overview"|label: "Projects"|label: "Analysis plan"|label: "Run analysis"|label: "Claims"|label: "Provenance"/);
});

test("provides a complete load, inspect, choose, run, and download workflow", () => {
  for (const text of ["Count matrix", "Sample metadata", "Inspect my files", "Scientific question", "Condition or outcome", "OPTIONAL COVARIATES", "ANALYSIS METHODS", "Confirm this exact plan", "Run confirmed plan", "Results CSV", "Audit JSON", "Analysis PDF"]) assert.match(viewSource, new RegExp(text));
  assert.match(viewSource, /type="file"/);
  assert.match(viewSource, /aria-pressed=\{selected\}/);
  assert.match(analysisSource, /Sample identifiers do not match/);
  assert.match(analysisSource, /Browser and R stats methods operate on log-CPM/);
});

test("runs uploaded data through selected JavaScript and genuine R methods", () => {
  const fixture = executeUploadedFixture();
  assert.equal(fixture.samples, 8);
  assert.equal(fixture.features, 20);
  assert.equal(fixture.integer, true);
  assert.ok(fixture.categorical.includes("group"));
  assert.deepEqual(fixture.runs.map((run) => run.id), ["js_adjusted_ols", "r_adjusted_ols"]);
  assert.equal(fixture.runs[0].rows, 20);
  assert.equal(fixture.runs[1].rows, 20);
  assert.match(fixture.runs[1].software, /^R version /);
  assert.equal(fixture.comparisons, 1);
  assert.equal(fixture.resultCsv, 41);
});

test("creates a valid uploaded-data analysis PDF", async () => {
  const pdf = new URL("../output/pdf/biotrust-uploaded-data-analysis-report.pdf", import.meta.url);
  const bytes = await readFile(pdf);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok((await stat(pdf)).size > 7000);
});
