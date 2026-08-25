import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createAnalysisReport } from "../app/report.ts";
import { parseUserDataset, runUserAnalysis, toReportResult } from "../app/userDataAnalysis.ts";
import { closeWebRRuntime } from "../app/webRAnalysis.ts";

const countsPath = fileURLToPath(new URL("../examples/counts.csv", import.meta.url));
const metadataPath = fileURLToPath(new URL("../examples/metadata.csv", import.meta.url));
const dataset = parseUserDataset(readFileSync(countsPath, "utf8"), readFileSync(metadataPath, "utf8"), "counts.csv", "metadata.csv");
const setup = {
  question: "Which expression features differ between treated and control samples after adjustment for batch?",
  conditionColumn: "condition",
  referenceLevel: "control",
  comparisonLevel: "treated",
  covariates: ["batch"],
  methods: ["js_adjusted_ols", "r_adjusted_ols"] as const,
};
const output = await runUserAnalysis(dataset, { ...setup, methods: [...setup.methods] });
const report = createAnalysisReport({
  result: toReportResult(dataset, output),
  isSynthetic: false,
  projectName: "Browser-local RNA-seq exploration",
  datasetName: "counts.csv",
  researchQuestion: setup.question,
  conditionColumn: setup.conditionColumn,
  covariates: setup.covariates,
});
const outputDirectory = fileURLToPath(new URL("../output/pdf/", import.meta.url));
const outputPath = fileURLToPath(new URL("../output/pdf/biotrust-uploaded-data-analysis-report.pdf", import.meta.url));
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, Buffer.from(report.output("arraybuffer")));
await closeWebRRuntime();
