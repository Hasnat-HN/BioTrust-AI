import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { runSyntheticMelanomaAnalysis } from "../app/melanomaDemo.ts";
import { createMelanomaReport } from "../app/melanomaReport.ts";
import { runDgeMethodComparison, runNeuralIntegration } from "../app/melanomaMethods.ts";

const { dataset, result } = runSyntheticMelanomaAnalysis();
const comparison = runDgeMethodComparison(dataset, result, ["adjusted_ols", "welch_t", "wilcoxon"]);
const neural = runNeuralIntegration(dataset);
const report = createMelanomaReport(result, 0.5, comparison, neural);
const outputDirectory = fileURLToPath(new URL("../output/pdf/", import.meta.url));
const outputPath = fileURLToPath(new URL("../output/pdf/biotrust-synthetic-melanoma-tme-report.pdf", import.meta.url));
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, Buffer.from(report.output("arraybuffer")));
