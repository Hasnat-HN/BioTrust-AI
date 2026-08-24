import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { runSyntheticMelanomaAnalysis } from "../app/melanomaDemo.ts";
import { createMelanomaReport } from "../app/melanomaReport.ts";

const { result } = runSyntheticMelanomaAnalysis();
const report = createMelanomaReport(result, 0.5);
const outputDirectory = fileURLToPath(new URL("../output/pdf/", import.meta.url));
const outputPath = fileURLToPath(new URL("../output/pdf/biotrust-synthetic-melanoma-tme-report.pdf", import.meta.url));
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, Buffer.from(report.output("arraybuffer")));

