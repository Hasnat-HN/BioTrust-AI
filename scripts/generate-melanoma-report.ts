import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { runSyntheticMelanomaAnalysis } from "../app/melanomaDemo.ts";
import { createMelanomaReport } from "../app/melanomaReport.ts";
import { runDgeMethodComparison, runNeuralIntegration } from "../app/melanomaMethods.ts";
import { defaultMelanomaPlan } from "../app/melanomaWorkflow.ts";
import { closeWebRRuntime, runWebRAnalysis } from "../app/webRAnalysis.ts";

const { dataset, result } = runSyntheticMelanomaAnalysis();
const comparison = runDgeMethodComparison(dataset, result, ["adjusted_ols", "welch_t", "wilcoxon"]);
const neural = runNeuralIntegration(dataset);
const rExecution = await runWebRAnalysis(dataset, ["r_adjusted_lm", "r_welch", "r_wilcoxon"]);
const report = createMelanomaReport(result, { plan: { ...defaultMelanomaPlan, analyses: ["dge", "r_dge", "programs", "purity", "neural"], dge_methods: ["adjusted_ols", "welch_t", "wilcoxon"], r_methods: ["r_adjusted_lm", "r_welch", "r_wilcoxon"], confirmed: true }, comparison, neural, rExecution });
const outputDirectory = fileURLToPath(new URL("../output/pdf/", import.meta.url));
const outputPath = fileURLToPath(new URL("../output/pdf/biotrust-synthetic-melanoma-tme-report.pdf", import.meta.url));
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, Buffer.from(report.output("arraybuffer")));
await closeWebRRuntime();
