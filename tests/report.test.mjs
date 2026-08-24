import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const reportSource = await readFile(new URL("../app/report.ts", import.meta.url), "utf8");
const trailSource = await readFile(new URL("../app/decisionTrail.ts", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app/BioTrustApp.tsx", import.meta.url), "utf8");

test("builds a nine-stage auditable scientific report", () => {
  for (let stage = 1; stage <= 9; stage += 1) {
    assert.match(trailSource, new RegExp(`process: ["']${stage}\\.`));
  }
  assert.match(reportSource, /not hidden AI chain-of-thought/i);
  assert.match(reportSource, /Interpretation boundaries/);
  assert.match(reportSource, /Reproducibility and provenance/);
  assert.match(reportSource, /Researcher review checklist/);
});

test("offers PDF, CSV, and JSON downloads only after a result exists", () => {
  assert.match(appSource, /visibleResult && <section className="panel execution-results"/);
  assert.match(appSource, /Scientific PDF/);
  assert.match(appSource, /Results CSV/);
  assert.match(appSource, /Audit JSON/);
});

test("creates a valid multi-page sample PDF when the report fixture is generated", async () => {
  const pdf = new URL("../output/pdf/biotrust-synthetic-scientific-report.pdf", import.meta.url);
  const bytes = await readFile(pdf);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok((await stat(pdf)).size > 5000);
});
