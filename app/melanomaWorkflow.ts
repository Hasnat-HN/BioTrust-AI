import { browserDgeMethods, type BrowserDgeMethodId } from "./melanomaMethods.ts";
import { webRMethods, type WebRMethodId } from "./webRAnalysis.ts";

export type MelanomaAnalysisModuleId = "dge" | "r_dge" | "programs" | "purity" | "neural";

export type MelanomaWorkflowPlan = {
  dataset_id: "SYN-MEL-20260825";
  research_question: string;
  analyses: MelanomaAnalysisModuleId[];
  dge_methods: BrowserDgeMethodId[];
  r_methods: WebRMethodId[];
  purity_threshold: number;
  confirmed: boolean;
};

export type PlanGuidance = {
  tone: "ready" | "consider" | "block" | "boundary";
  title: string;
  detail: string;
};

export const melanomaResearchQuestion = "In baseline melanoma tumors, which expression features and tumor-microenvironment programs are associated with synthetic PD-1 response after accounting for age, recorded sex, disease stage, biopsy site, prior systemic therapy, tumor purity, and sequencing batch?";

export const defaultMelanomaPlan: MelanomaWorkflowPlan = {
  dataset_id: "SYN-MEL-20260825",
  research_question: melanomaResearchQuestion,
  analyses: [],
  dge_methods: [],
  r_methods: [],
  purity_threshold: 0.5,
  confirmed: false,
};

export const melanomaAnalysisModules: Array<{
  id: MelanomaAnalysisModuleId;
  title: string;
  method: string;
  question: string;
  output: string;
  boundary: string;
}> = [
  {
    id: "dge",
    title: "Feature-level differential expression",
    method: "Choose 1-3 browser methods",
    question: "Which individual expression features differ between synthetic response groups?",
    output: "Per-method effects, p-values, BH FDR, and an automatic comparison when two or more methods are selected.",
    boundary: "Browser models demonstrate method choice; count-native publication analysis still requires edgeR or DESeq2 in R.",
  },
  {
    id: "r_dge",
    title: "R package differential expression",
    method: "Real R in the browser with webR",
    question: "Do selected R stats package functions reproduce or challenge the browser DGE pattern?",
    output: "Per-feature R effects, test statistics, p-values, BH FDR, package version, and downloadable R results.",
    boundary: "These are genuine R stats executions, but they are transformed-count methods rather than edgeR or DESeq2.",
  },
  {
    id: "programs",
    title: "Tumor-microenvironment program summary",
    method: "Adjusted-effect aggregation",
    question: "Do related synthetic T-cell, interferon, myeloid, or stromal features move coherently?",
    output: "Program-level mean adjusted effects and significant-feature counts.",
    boundary: "A program summary is not a correlation-aware gene-set test and does not measure cell abundance.",
  },
  {
    id: "purity",
    title: "Tumor-purity sensitivity",
    method: "Multivariable model in a restricted subset",
    question: "Does the adjusted T-cell-program association persist after excluding lower-purity tumors?",
    output: "Primary-versus-restricted effect, interval, p-value, and retained sample count.",
    boundary: "Stability under one restriction does not eliminate unmeasured confounding.",
  },
  {
    id: "neural",
    title: "Neural integration",
    method: "13 → 8 → 1 shallow network; five-fold CV",
    question: "Can program scores and clinical/technical covariates jointly predict the synthetic response label?",
    output: "Cross-validated AUROC, balanced accuracy, Brier score, and weight-path sensitivity.",
    boundary: "Prediction does not establish mechanism, causal importance, biomarker validity, or treatment benefit.",
  },
];

export function validateMelanomaPlan(plan: MelanomaWorkflowPlan): string[] {
  const issues: string[] = [];
  if (!plan.research_question.trim()) issues.push("Write a research question before confirming the plan.");
  if (plan.analyses.length === 0) issues.push("Select at least one analysis to run.");
  if (plan.analyses.includes("dge") && plan.dge_methods.length === 0) issues.push("Select at least one differential-expression method.");
  if (plan.analyses.includes("r_dge") && plan.r_methods.length === 0) issues.push("Select at least one R package method.");
  return issues;
}

export function buildPlanGuidance(plan: MelanomaWorkflowPlan): PlanGuidance[] {
  const guidance: PlanGuidance[] = [];
  const adjustedSelected = plan.dge_methods.includes("adjusted_ols");
  const dgeSelected = plan.analyses.includes("dge");
  const rSelected = plan.analyses.includes("r_dge");
  if (plan.analyses.length === 0) {
    guidance.push({ tone: "block", title: "No analysis selected", detail: "Choose at least one analysis. The graphical data profile will still run first, but it does not answer the research question." });
  }
  if (dgeSelected && plan.dge_methods.length === 0) {
    guidance.push({ tone: "block", title: "DGE needs a method", detail: "Select at least one browser method before the plan can be confirmed." });
  } else if (dgeSelected && !adjustedSelected) {
    guidance.push({ tone: "consider", title: "Your selected DGE methods are unadjusted", detail: "Welch and Wilcoxon cannot account for the seven clinical and technical covariates. Add Adjusted OLS if the conditional research question is primary." });
  } else if (dgeSelected) {
    guidance.push({ tone: "ready", title: "Adjusted OLS matches the declared estimand", detail: "It is the only browser method here that estimates the response association conditional on age, sex, stage, site, prior therapy, purity, and batch." });
  }
  if (dgeSelected && plan.dge_methods.length === 1) {
    guidance.push({ tone: "consider", title: "One DGE method will not create a comparison", detail: "This is allowed. Select a second method if you want effect-rank, sign, top-50, and FDR-overlap comparisons." });
  }
  if (dgeSelected && plan.dge_methods.length >= 2) {
    const names = plan.dge_methods.map((id) => browserDgeMethods.find((method) => method.id === id)?.short_name).join(", ");
    guidance.push({ tone: "ready", title: `${plan.dge_methods.length}-method comparison will run`, detail: `${names} will receive the same samples, log2-CPM matrix, feature universe, labels, and BH threshold. BioTrust will keep their estimands separate. Method agreement is not replication; it is sensitivity evidence.` });
  }
  if (rSelected && plan.r_methods.length === 0) {
    guidance.push({ tone: "block", title: "R execution needs a method", detail: "Choose at least one R stats package function. The R runtime starts only after you confirm and press Run." });
  } else if (rSelected) {
    const names = plan.r_methods.map((id) => webRMethods.find((method) => method.id === id)?.short_name).join(", ");
    const adjustedSelectedInR = plan.r_methods.includes("r_adjusted_lm");
    guidance.push({ tone: adjustedSelectedInR ? "ready" : "consider", title: `${plan.r_methods.length} real R method${plan.r_methods.length === 1 ? "" : "s"} selected`, detail: `${names} will execute locally through webR. ${adjustedSelectedInR ? "The R adjusted model matches the conditional question." : "The selected R methods are unadjusted; add R Adjusted OLS for the conditional question."}` });
    guidance.push({ tone: "boundary", title: "R package boundary", detail: "The browser includes R's stats package. edgeR and DESeq2 require compatible WebAssembly builds or a controlled R server and are not mislabeled as browser executions." });
  }
  if (plan.analyses.includes("programs")) guidance.push({ tone: "boundary", title: "Program summaries organize the DGE signal", detail: "They help connect features into tumor-microenvironment patterns, but they are not cell-fraction estimates or formal correlation-aware gene-set tests." });
  if (plan.analyses.includes("purity")) guidance.push({ tone: "ready", title: `Purity sensitivity is set to ≥ ${plan.purity_threshold.toFixed(2)}`, detail: "The full adjusted program model will be repeated in the restricted synthetic subset and compared with the primary estimate." });
  if (plan.analyses.includes("neural")) guidance.push({ tone: "boundary", title: "Neural integration answers a prediction question", detail: "It can connect multivariable patterns, but it remains subordinate to the statistical association analyses and cannot explain mechanism." });
  guidance.push({ tone: "boundary", title: "Production boundary", detail: "edgeR quasi-likelihood and DESeq2 Wald are available through the controlled R runner, not imitated in the public browser." });
  return guidance;
}
