import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dataSource = await readFile(new URL("../app/data.ts", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app/BioTrustApp.tsx", import.meta.url), "utf8");

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
