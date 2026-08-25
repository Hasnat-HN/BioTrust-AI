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
  assert.match(appSource, /Run edgeR or DESeq2 on an authorized real dataset/);
  assert.match(appSource, /api\/executions\/run/);
  assert.match(appSource, /edgeR quasi-likelihood/);
  assert.match(appSource, /DESeq2 Wald test/);
  assert.match(appSource, /no arbitrary formulas/i);
  assert.match(appSource, /secure real-data runner is not connected to this public page/i);
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
  assert.match(appSource, /useState<View>\("how"\)/);
  assert.match(appSource, /label: "How it works"/);
  assert.match(appSource, /label: "Example"/);
  assert.doesNotMatch(appSource, /label: "Analysis plan"|label: "Run analysis"/);
  assert.match(melanomaSource, /YOU CONTROL THE RUN/);
  assert.match(melanomaSource, /Run my analysis plan/);
  assert.match(melanomaSource, /Results sealed/);
  assert.match(melanomaSource, /plan\.confirmed/);
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
  assert.match(howSource, /ONE BUILT-IN EXAMPLE/);
  assert.match(howSource, /Synthetic melanoma RNA-seq/);
  assert.match(howSource, /load your own count matrix and sample metadata/);
  assert.match(howSource, /genuine R methods/);
  assert.match(howSource, /Only confirmed methods run/);
  assert.match(howSource, /Suggestion is never confused with authorization/);
  assert.match(howSource, /PDF, CSV, and audit export/);
  assert.match(appSource, /className="run-progress"/);
  assert.match(melanomaSource, /AI METHOD GUIDE · LOCAL RULES/);
  assert.match(melanomaSource, /Example · build the plan/);
  assert.doesNotMatch(appSource, /Mock provider/);
});
