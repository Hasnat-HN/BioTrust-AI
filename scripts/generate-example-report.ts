import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createAnalysisReport, type ReportExecutionResult } from "../app/report.ts";

const result: ReportExecutionResult = {
  execution_id: "SYN-20250314-001",
  status: "completed",
  method: "edgeR quasi-likelihood",
  comparison: "Group_B",
  reference: "Group_A",
  design: "~ Technical_Batch + condition",
  sample_count: 120,
  feature_count: 12000,
  retained_feature_count: 8421,
  input_hashes: { counts_sha256: "synthetic-8fb2d91c", metadata_sha256: "synthetic-42ae71d0" },
  output_hash: "synthetic-51ac82b7",
  software_versions: { R: "4.4.x", edgeR: "4.4.x" },
  warnings: ["Demonstration result only; no biological or clinical interpretation is intended."],
  generated_at: "2025-03-14T10:18:42.000Z",
  results: [
    { feature_id: "Feature_001", log2_fold_change: 1.284, statistic: 5.921, p_value: 0.000004, adjusted_p_value: 0.0032 },
    { feature_id: "Feature_002", log2_fold_change: -1.071, statistic: -5.104, p_value: 0.000018, adjusted_p_value: 0.0076 },
    { feature_id: "Feature_003", log2_fold_change: 0.893, statistic: 4.667, p_value: 0.000041, adjusted_p_value: 0.0115 },
    { feature_id: "Feature_004", log2_fold_change: -0.744, statistic: -4.201, p_value: 0.000093, adjusted_p_value: 0.0194 },
    { feature_id: "Feature_005", log2_fold_change: 0.619, statistic: 3.884, p_value: 0.000212, adjusted_p_value: 0.0311 },
    { feature_id: "Feature_006", log2_fold_change: -0.481, statistic: -3.226, p_value: 0.00128, adjusted_p_value: 0.084 },
  ],
};

const report = createAnalysisReport({
  result,
  isSynthetic: true,
  projectName: "Synthetic transcriptomic association study",
  datasetName: "Synthetic_Cohort",
  researchQuestion: "Which features differ between Group_B and Group_A under the fixed demonstration design?",
  conditionColumn: "condition",
  covariates: ["Technical_Batch"],
});
const outputDirectory = fileURLToPath(new URL("../output/pdf/", import.meta.url));
const outputPath = fileURLToPath(new URL("../output/pdf/biotrust-synthetic-scientific-report.pdf", import.meta.url));
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, Buffer.from(report.output("arraybuffer")));
