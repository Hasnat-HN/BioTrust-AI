import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/MelanomaCaseStudyView.tsx", import.meta.url), "utf8");
const engineSource = await readFile(new URL("../app/melanomaDemo.ts", import.meta.url), "utf8");

function executeFixture() {
  const moduleUrl = new URL("../app/melanomaDemo.ts", import.meta.url).href;
  const expression = `import(${JSON.stringify(moduleUrl)}).then((m) => { const {dataset,result}=m.runSyntheticMelanomaAnalysis(); console.log(JSON.stringify({samples:dataset.samples.length,features:dataset.featureIds.length,responders:result.dataset.responder_count,primary:result.primary.response_effect,sensitivity:result.sensitivity.response_effect,hashes:result.hashes,first:dataset.samples[0],connections:m.buildMelanomaInterpretation(result).connections.length})); })`;
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
});

test("requires an explicit researcher decision before execution", () => {
  assert.match(appSource, /I understand that every sample and result is synthetic/);
  assert.match(appSource, /Reject/);
  assert.match(appSource, /Modify sensitivity/);
  assert.match(appSource, /Accept proposal/);
  assert.match(appSource, /decision !== "accepted" && decision !== "modified"/);
  assert.match(appSource, /Results are sealed/);
});

test("declares complex covariates and honest method boundaries", () => {
  for (const term of ["age_years", "recorded_sex", "disease_stage", "biopsy_site", "prior_systemic_therapy", "tumor_purity"]) assert.match(engineSource, new RegExp(term));
  assert.match(engineSource, /Benjamini-Hochberg|bhAdjust/);
  assert.match(appSource, /This page does not claim to execute either R package/);
  assert.match(appSource, /not estimates of cell abundance/);
});

test("connects evidence without pretending a neural model is active", () => {
  assert.match(engineSource, /deterministic evidence-synthesis rules v1/);
  assert.match(engineSource, /neural_adapter_status: "NOT_CONNECTED"/);
  assert.match(appSource, /NEURAL ADAPTER · NOT CONNECTED/);
  assert.match(appSource, /Evidence: \{connection\.evidence_refs/);
});

test("offers the full evidence package after execution", () => {
  for (const label of ["Metadata CSV", "Counts CSV", "Results CSV", "Audit JSON", "Scientific PDF"]) assert.match(appSource, new RegExp(label));
});

test("creates a valid synthetic melanoma report", async () => {
  const pdf = new URL("../output/pdf/biotrust-synthetic-melanoma-tme-report.pdf", import.meta.url);
  const bytes = await readFile(pdf);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok((await stat(pdf)).size > 9000);
});

