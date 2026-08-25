import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/MelanomaCaseStudyView.tsx", import.meta.url), "utf8");
const engineSource = await readFile(new URL("../app/melanomaDemo.ts", import.meta.url), "utf8");
const methodSource = await readFile(new URL("../app/melanomaMethods.ts", import.meta.url), "utf8");
const workflowSource = await readFile(new URL("../app/melanomaWorkflow.ts", import.meta.url), "utf8");

function executeFixture() {
  const moduleUrl = new URL("../app/melanomaDemo.ts", import.meta.url).href;
  const methodsUrl = new URL("../app/melanomaMethods.ts", import.meta.url).href;
  const expression = `Promise.all([import(${JSON.stringify(moduleUrl)}),import(${JSON.stringify(methodsUrl)})]).then(([m,x]) => { const {dataset,result}=m.runSyntheticMelanomaAnalysis(); const exploration=x.exploreMelanomaDataset(dataset); const comparison=x.runDgeMethodComparison(dataset,result,["adjusted_ols","welch_t","wilcoxon"]); const single=x.runDgeMethodComparison(dataset,result,["adjusted_ols"]); const neural=x.runNeuralIntegration(dataset); const synthesis=x.buildComparisonSynthesis(comparison,neural); const singleSynthesis=x.buildComparisonSynthesis(single); console.log(JSON.stringify({samples:dataset.samples.length,features:dataset.featureIds.length,responders:result.dataset.responder_count,primary:result.primary.response_effect,sensitivity:result.sensitivity.response_effect,hashes:result.hashes,first:dataset.samples[0],connections:synthesis.connections.length,zeroRate:exploration.matrix.zero_rate,runs:comparison.runs.map((run)=>run.method.id),pairwise:comparison.pairwise,consensus:comparison.consensus_features.length,neural,single:{pairwise:single.pairwise.length,summary:singleSynthesis.summary,connections:singleSynthesis.connections.length}})); })`;
  return JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", expression], { encoding: "utf8" }));
}

test("generates a deterministic multivariable synthetic melanoma fixture", () => {
  const fixture = executeFixture();
  assert.equal(fixture.samples, 180);
  assert.equal(fixture.features, 1200);
  assert.equal(fixture.responders, 72);
  assert.ok(fixture.primary > 0);
  assert.ok(fixture.sensitivity > 0);
  assert.match(fixture.hashes.metadata, /^fnv1a-[0-9a-f]{8}$/);
  assert.equal(fixture.first.sample_id, "SYN_MEL_001");
  for (const field of ["age_years", "recorded_sex", "disease_stage", "biopsy_site", "prior_systemic_therapy", "tumor_purity", "batch"]) assert.ok(field in fixture.first);
  assert.equal(fixture.connections, 6);
  assert.ok(fixture.zeroRate > 0 && fixture.zeroRate < 0.2);
  assert.deepEqual(fixture.runs, ["adjusted_ols", "welch_t", "wilcoxon"]);
  assert.equal(fixture.pairwise.length, 3);
  assert.ok(fixture.consensus > 0);
  assert.equal(fixture.single.pairwise, 0);
  assert.equal(fixture.single.connections, 6);
  assert.doesNotMatch(fixture.single.summary, /NaN/);
});

test("keeps the melanoma example separate from planning and execution", () => {
  assert.match(appSource, /NO ANALYSIS RUNS HERE/);
  assert.match(appSource, /Those decisions belong to the researcher in/);
  assert.match(appSource, /Build an analysis plan/);
  assert.match(appSource, /Choose exactly what will run/);
  assert.match(appSource, /Confirm plan and continue/);
  assert.match(appSource, /if \(!plan\.confirmed\)/);
  assert.match(appSource, /Results sealed/);
});

test("allows analysis modules and one or more DGE methods to be researcher-selected", () => {
  for (const analysisModule of ["dge", "programs", "purity", "neural"]) assert.match(workflowSource, new RegExp(`id: "${analysisModule}"`));
  for (const method of ["adjusted_ols", "welch_t", "wilcoxon"]) assert.match(methodSource, new RegExp(`id: "${method}"`));
  assert.match(appSource, /Select any analysis modules you want to run/);
  assert.match(appSource, /One method is allowed/);
  assert.match(appSource, /Method comparison activated/);
  assert.match(appSource, /Only researcher-selected methods appear below/);
});

test("declares complex covariates and honest method boundaries", () => {
  for (const term of ["age_years", "recorded_sex", "disease_stage", "biopsy_site", "prior_systemic_therapy", "tumor_purity"]) assert.match(engineSource, new RegExp(term));
  assert.match(methodSource, /Benjamini-Hochberg|bhAdjust/);
  assert.match(appSource, /public browser will not pretend to execute/i);
  assert.match(workflowSource, /agreement is not replication/i);
});

test("runs an actual bounded neural model without treating prediction as evidence", () => {
  assert.match(engineSource, /deterministic evidence-synthesis rules v1/);
  assert.match(methodSource, /13 standardized inputs -> 8 tanh hidden units -> 1 sigmoid output/);
  assert.match(methodSource, /folds = 5/);
  assert.match(appSource, /NEURAL ENGINE · COMPLETE/);
  assert.ok(fixtureForNeural().auc > 0.5);
  assert.match(appSource, /Evidence: \{connection\.evidence_refs/);
});

function fixtureForNeural() {
  return executeFixture().neural;
}

test("offers the full evidence package after execution", () => {
  for (const label of ["Metadata CSV", "Counts CSV", "Selected DGE CSV", "Plan audit JSON", "Analysis PDF"]) assert.match(appSource, new RegExp(label));
});

test("creates a valid synthetic melanoma report", async () => {
  const pdf = new URL("../output/pdf/biotrust-synthetic-melanoma-tme-report.pdf", import.meta.url);
  const bytes = await readFile(pdf);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok((await stat(pdf)).size > 9000);
});
