export type ReportResultRow = {
  feature_id: string;
  log2_fold_change: number | null;
  statistic: number | null;
  p_value: number | null;
  adjusted_p_value: number | null;
};

export type ReportExecutionResult = {
  execution_id: string;
  status: string;
  method: string;
  comparison: string;
  reference: string;
  design: string;
  sample_count: number;
  feature_count: number;
  retained_feature_count: number;
  input_hashes: Record<string, string>;
  output_hash: string;
  software_versions: Record<string, string>;
  warnings: string[];
  generated_at: string;
  results: ReportResultRow[];
};

export type DecisionTrailEntry = {
  process: string;
  whatHappened: string;
  whyItMatters: string;
  evidence: string;
  status: "COMPLETE" | "REVIEW";
};

export type AnalysisReportOptions = {
  result: ReportExecutionResult;
  isSynthetic: boolean;
  projectName?: string;
  datasetName?: string;
  researchQuestion?: string;
  conditionColumn?: string;
  covariates?: string[];
};

export const methodName = (method: string) => method.includes("deseq2") || method.includes("DESeq2")
  ? "DESeq2 Wald test"
  : method.includes("edgeR") || method.includes("edger")
    ? "edgeR quasi-likelihood"
    : method;

export const methodRationale = (method: string) => method.includes("deseq2") || method.includes("DESeq2")
  ? "Selected for a replicated RNA-seq count comparison. DESeq2 estimates count dispersion, fits the declared design, and evaluates the specified contrast with a Wald test."
  : method.includes("edgeR") || method.includes("edger")
    ? "Selected for a replicated RNA-seq count comparison. The edgeR quasi-likelihood workflow estimates biological dispersion and evaluates the specified contrast while retaining a conservative error model."
    : method.toLowerCase().includes("adjusted") || method.toLowerCase().includes("multivariable")
      ? "Selected to estimate the group association after the researcher-declared covariates. It uses log-CPM values and a multivariable linear model; it is not a count-native edgeR or DESeq2 analysis."
      : method.toLowerCase().includes("welch")
        ? "Selected as an unadjusted two-group sensitivity screen that allows unequal group variances. It cannot account for clinical or technical covariates."
        : method.toLowerCase().includes("wilcoxon")
          ? "Selected as an unadjusted rank-based sensitivity screen. It evaluates a different estimand and cannot account for covariates."
          : "Selected by the researcher for the declared comparison. Its assumptions and interpretation boundary require method-specific review.";

export function buildDecisionTrail(options: AnalysisReportOptions): DecisionTrailEntry[] {
  const { result, isSynthetic } = options;
  const significant = result.results.filter((row) => row.adjusted_p_value !== null && row.adjusted_p_value < 0.05).length;
  const hasSha256 = Object.entries(result.input_hashes).some(([name, value]) => name.toLowerCase().includes("sha256") && /^[a-f0-9]{64}$/i.test(value));
  return [
    {
      process: "1. Define the question",
      whatHappened: options.researchQuestion ?? `${result.comparison} was compared with ${result.reference}.`,
      whyItMatters: "A precise question prevents the result from being interpreted as evidence for a different claim.",
      evidence: `Declared contrast: ${result.comparison} versus ${result.reference}`,
      status: "COMPLETE",
    },
    {
      process: "2. Identify the data",
      whatHappened: `${options.datasetName ?? (isSynthetic ? "Synthetic_Cohort" : "Researcher dataset")} supplied ${result.sample_count} samples and ${result.feature_count.toLocaleString()} features.`,
      whyItMatters: "The report must identify exactly which data version produced the result without reproducing private raw values.",
      evidence: isSynthetic ? "Fixed demonstration fixture" : hasSha256 ? "SHA-256 input hashes recorded below" : "Browser-local input record included below",
      status: "COMPLETE",
    },
    {
      process: "3. Validate the inputs",
      whatHappened: "Sample identifiers matched, feature identifiers were unique, counts were non-negative integers, and both groups met the minimum replication rule.",
      whyItMatters: "Invalid count matrices or mismatched metadata can produce meaningless models or mislabeled comparisons.",
      evidence: "Input validation completed before execution; failed validations stop the workflow.",
      status: "COMPLETE",
    },
    {
      process: "4. Choose the method",
      whatHappened: `${methodName(result.method)} was used. ${methodRationale(result.method)}`,
      whyItMatters: "The statistical method must match the data type, design, and estimand.",
      evidence: `Allowlisted method: ${result.method}`,
      status: "COMPLETE",
    },
    {
      process: "5. Confirm the exact plan",
      whatHappened: `The executed design was ${result.design}; the contrast was ${result.comparison} versus ${result.reference}.`,
      whyItMatters: "The researcher should see the exact formula and contrast before accepting the analysis plan.",
      evidence: options.covariates?.length ? `Declared covariates: ${options.covariates.join(", ")}` : "No additional covariates declared in this report.",
      status: "COMPLETE",
    },
    {
      process: "6. Execute reproducibly",
      whatHappened: `${result.retained_feature_count.toLocaleString()} features were retained and evaluated in the recorded runtime.`,
      whyItMatters: "A result must resolve to an execution identifier, software versions, and immutable input/output hashes.",
      evidence: `Execution ${result.execution_id}; output ${result.output_hash}`,
      status: "COMPLETE",
    },
    {
      process: "7. Review statistical checks",
      whatHappened: `${significant} reported feature${significant === 1 ? "" : "s"} had an adjusted p-value below 0.05 in the returned table.`,
      whyItMatters: "Multiplicity control is necessary, but statistical significance alone does not establish validity or biological importance.",
      evidence: "Benjamini-Hochberg adjusted p-values supplied by the selected method.",
      status: "REVIEW",
    },
    {
      process: "8. Interpret conservatively",
      whatHappened: "The output describes statistical associations for the declared contrast. It does not establish causality, mechanism, progression, diagnosis, or clinical utility.",
      whyItMatters: "Interpretation must not exceed the design or evidence available.",
      evidence: result.warnings.join(" ") || "Standard conservative interpretation boundary applied.",
      status: "REVIEW",
    },
    {
      process: "9. Export the record",
      whatHappened: "This report packages the plan, decision trail, result preview, limitations, software versions, and hashes.",
      whyItMatters: "A portable record supports review, reproducibility, and responsible publication preparation.",
      evidence: `Report generated from structured execution ${result.execution_id}.`,
      status: "COMPLETE",
    },
  ];
}
