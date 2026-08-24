import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dataSource = await readFile(new URL("../app/data.ts", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app/BioTrustApp.tsx", import.meta.url), "utf8");
const howSource = await readFile(new URL("../app/HowItWorksView.tsx", import.meta.url), "utf8");
const melanomaSource = await readFile(new URL("../app/MelanomaCaseStudyView.tsx", import.meta.url), "utf8");

test("ships a broad, reviewable built-in method catalog", () => {
  for (const slug of [
    "edger-quasi-likelihood",
    "deseq2-wald",
    "deseq2-lrt",
    "limma-camera",
    "fgsea-preranked",
    "dream-repeated-measures",
    "combat-seq",
    "spearman-correlation",
  ]) {
    assert.match(dataSource, new RegExp(`slug: ["']${slug}["']`));
  }

  assert.match(dataSource, /officialDocumentation:/);
  assert.match(dataSource, /export const builtInMethods: MethodCard\[\]/);
});

test("custom method cards are local and always require review", () => {
  assert.match(appSource, /biotrust\.custom-methods\.v1/);
  assert.match(appSource, /origin: "CUSTOM"/);
  assert.match(appSource, /status: "REVIEW_REQUIRED"/);
  assert.match(appSource, /Researcher-added cards stay local and are visibly marked for review/);
});

test("controlled execution stays gated while supporting a configured runner", () => {
  assert.match(appSource, /Run a controlled analysis/);
  assert.match(appSource, /api\/executions\/run/);
  assert.match(appSource, /edgeR quasi-likelihood/);
  assert.match(appSource, /DESeq2 Wald test/);
  assert.match(appSource, /no arbitrary formulas/i);
  assert.match(appSource, /secure real-data runner is not connected yet/i);
  assert.match(appSource, /runtime\.state !== "ready"/);
  assert.match(appSource, /Scientific PDF/);
  assert.match(appSource, /I confirm this exact plan/);
});

test("sidebar stays focused on navigation without inventing a researcher identity", () => {
  assert.match(appSource, /How it works/);
  assert.doesNotMatch(appSource, /BioTrust Workspace/);
  assert.doesNotMatch(appSource, /Local research environment/);
  assert.doesNotMatch(appSource, /Synthetic researcher/);
});

test("the public demonstration begins empty and reveals results only after an explicit synthetic run", () => {
  assert.match(appSource, /useState<View>\("melanoma"\)/);
  assert.match(melanomaSource, /Explore synthetic dataset/);
  assert.match(melanomaSource, /Run and compare methods/);
  assert.match(melanomaSource, /Results sealed/);
  assert.match(melanomaSource, /decision !== "accepted"/);
  assert.match(appSource, /syntheticResult \? <TrustView/);
  assert.match(appSource, /syntheticResult \? <ClaimsView/);
  assert.match(appSource, /syntheticResult \? <ProvenanceView/);
});

test("defaults to black and uses one neutral appearance control", () => {
  assert.match(appSource, /trail-node third/);
  assert.doesNotMatch(appSource, /className="brand-mark">B</);
  assert.match(appSource, /useState<Theme>\("dark"\)/);
  assert.match(appSource, /biotrust\.theme\.v1/);
  assert.match(appSource, /className="sidebar-theme-toggle"/);
  assert.match(appSource, /aria-label="Change appearance"/);
  assert.doesNotMatch(appSource, /Black mode|Light mode|Switch to/);
});

test("explains the complete workflow with one consistent synthetic example", () => {
  assert.match(howSource, /Resolve a complex question into testable parts/);
  assert.match(howSource, /associated with a reproducible expression program/);
  assert.match(howSource, /Clinical_Score/);
  assert.match(howSource, /without claiming causation, mediation, or cell abundance/);
  assert.match(howSource, /Technical_Batch/);
  for (const branch of ["P1", "S1", "C1", "G1", "V1"]) assert.match(howSource, new RegExp(`id: "${branch}"`));
  assert.match(howSource, /Robustness support; not replication/);
  assert.match(howSource, /Shared pattern; not mediation or causation/);
  assert.match(howSource, /Gene-set shift; not measured cell abundance/);
  assert.match(howSource, /additional branches require controlled adapters rather than simulated results/);
  assert.match(appSource, /className="run-progress"/);
  assert.match(appSource, /Linked analysis program/);
  assert.match(appSource, /PROTOCOL LOCKED/);
  assert.doesNotMatch(appSource, /Mock provider/);
});
