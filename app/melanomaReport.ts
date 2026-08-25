import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { InterpretationConnection, MelanomaAnalysisResult } from "./melanomaDemo.ts";
import { buildComparisonSynthesis, type DgeMethodComparison, type NeuralIntegrationResult } from "./melanomaMethods.ts";
import { melanomaResearchQuestion, type MelanomaAnalysisModuleId, type MelanomaWorkflowPlan } from "./melanomaWorkflow.ts";
import type { WebRExecutionResult } from "./webRAnalysis.ts";

const ink: [number, number, number] = [29, 38, 42];
const muted: [number, number, number] = [85, 99, 103];
const teal: [number, number, number] = [45, 111, 95];
const pale: [number, number, number] = [241, 246, 244];
const line: [number, number, number] = [215, 225, 221];

const fmt = (value: number, digits = 2) => value.toFixed(digits);
const fmtP = (value: number) => value < 0.001 ? value.toExponential(2) : value.toFixed(3);

function section(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(...teal);
  doc.rect(16, y - 3.5, 2.5, 7, "F");
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 23, y + 1.5);
}

function paragraph(doc: jsPDF, text: string, x: number, y: number, width: number, size = 8, color: [number, number, number] = muted) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(doc.splitTextToSize(text, width), x, y);
}

function label(doc: jsPDF, text: string, x: number, y: number, color: [number, number, number] = teal) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...color);
  doc.text(text.toUpperCase(), x, y);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...line);
    doc.line(16, 284, 194, 284);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.setTextColor(120, 132, 132);
    doc.text("BioTrust AI synthetic research demonstration - not medical advice or clinical evidence", 16, 289);
    doc.text(`Page ${page} of ${pages}`, 194, 289, { align: "right" });
  }
}

type MelanomaReportOptions = {
  plan?: MelanomaWorkflowPlan;
  comparison?: DgeMethodComparison;
  neural?: NeuralIntegrationResult;
  rExecution?: WebRExecutionResult;
};

const analysisLabels: Record<MelanomaAnalysisModuleId, string> = {
  dge: "Feature-level DGE",
  r_dge: "R package DGE",
  programs: "TME program summary",
  purity: "Tumor-purity sensitivity",
  neural: "Neural integration",
};

function buildSelectedAnalysisSynthesis(result: MelanomaAnalysisResult, analyses: Set<MelanomaAnalysisModuleId>, neural?: NeuralIntegrationResult, rExecution?: WebRExecutionResult) {
  const connections: InterpretationConnection[] = [{
    id: "D1",
    kind: "evidence",
    title: "Dataset profile completed",
    finding: `${result.dataset.sample_count} synthetic tumors and ${result.dataset.feature_count.toLocaleString()} expression features passed into the researcher-selected plan.`,
    implication: "This describes the synthetic matrix; it does not answer a response-association question by itself.",
    evidence_refs: ["dataset.sample_count", "dataset.feature_count", "researcher_plan.analyses"],
  }];
  if (analyses.has("programs")) {
    const program = result.program_summaries.find((item) => item.program === "T-cell-inflamed program")!;
    connections.push({
      id: "P1",
      kind: "evidence",
      title: "Selected TME program summary",
      finding: `The synthetic T-cell-inflamed program has mean adjusted effect ${program.mean_response_effect.toFixed(2)} across ${program.feature_count} features.`,
      implication: "The selected module summarizes coordinated expression; it is not a cell-abundance estimate or a formal gene-set test.",
      evidence_refs: ["program_summaries.T-cell-inflamed", "researcher_plan.analyses.programs"],
    });
  }
  if (analyses.has("purity")) {
    connections.push({
      id: "S1",
      kind: "qualifier",
      title: "Selected tumor-purity sensitivity",
      finding: `${result.sensitivity.sample_count} tumors remain after restriction; the adjusted response effect is ${result.sensitivity.response_effect.toFixed(2)}.`,
      implication: "Directional stability under one restriction is a robustness check, not evidence that all mixture bias is removed.",
      evidence_refs: ["sensitivity.sample_count", "sensitivity.response_effect", "researcher_plan.analyses.purity"],
    });
  }
  if (analyses.has("neural") && neural) {
    connections.push({
      id: "N1",
      kind: "boundary",
      title: "Selected neural prediction view",
      finding: `Five-fold internal AUROC is ${neural.auc.toFixed(3)} and balanced accuracy is ${(100 * neural.balanced_accuracy).toFixed(1)}% in this synthetic cohort.`,
      implication: "Prediction does not establish mechanism, causal importance, biomarker validity, or external performance.",
      evidence_refs: ["neural_integration.auc", "neural_integration.balanced_accuracy"],
    });
  }
  if (analyses.has("r_dge") && rExecution) {
    connections.push({
      id: "R1",
      kind: "evidence",
      title: "Selected R package execution",
      finding: `${rExecution.methods.length} selected stats package method${rExecution.methods.length === 1 ? "" : "s"} ran in ${rExecution.r_version}; discovery counts range from ${Math.min(...rExecution.methods.map((run) => run.significant_count))} to ${Math.max(...rExecution.methods.map((run) => run.significant_count))}.`,
      implication: "This is a genuine local R execution record, but transformed-count stats methods are not count-native edgeR or DESeq2 analyses.",
      evidence_refs: ["r_package_execution.r_version", "r_package_execution.methods", "researcher_plan.r_methods"],
    });
  }
  connections.push({
    id: "B1",
    kind: "boundary",
    title: "Unselected analyses remain absent",
    finding: "No feature-level DGE result, comparison statistic, or predictive metric was inferred unless that module was present in the confirmed plan.",
    implication: "Interpret only the outputs listed in the plan receipt and audit record.",
    evidence_refs: ["researcher_plan.analyses", "plan_audit"],
  });
  return {
    generated_by: "BioTrust plan-bounded synthesis rules v3",
    summary: `The report is limited to ${[...analyses].map((id) => analysisLabels[id]).join(", ")}. BioTrust connects those selected outputs while preserving the boundary between description, association, prediction, and replication.`,
    connections,
  };
}

export function createMelanomaReport(result: MelanomaAnalysisResult, options: MelanomaReportOptions = {}): jsPDF {
  const { plan, comparison, neural, rExecution } = options;
  const purityThreshold = plan?.purity_threshold ?? 0.5;
  const selected = new Set<MelanomaAnalysisModuleId>(plan?.analyses ?? ["dge", "programs", "purity", ...(neural ? ["neural" as const] : [])]);
  const comparisonInterpretation = comparison ? buildComparisonSynthesis(comparison, neural) : null;
  const selectedInterpretation = buildSelectedAnalysisSynthesis(result, selected, neural, rExecution);
  const interpretation = comparisonInterpretation
    ? {
        ...comparisonInterpretation,
        summary: `${comparisonInterpretation.summary}${rExecution ? ` ${rExecution.methods.length} selected R stats package method${rExecution.methods.length === 1 ? "" : "s"} also completed in ${rExecution.r_version}.` : ""}`,
        connections: rExecution ? [...comparisonInterpretation.connections, ...selectedInterpretation.connections.filter((connection) => connection.id === "R1")] : comparisonInterpretation.connections,
      }
    : selectedInterpretation;
  const displayedFeatureResults = comparison?.runs.find((run) => run.method.id === comparison.recommendation.method_id)?.results ?? comparison?.runs[0]?.results ?? [];
  const selectedDgeNames = comparison?.runs.map((run) => run.method.short_name).join(", ") ?? "Not selected";
  const selectedRNames = rExecution?.methods.map((run) => run.method.short_name).join(", ") ?? (selected.has("r_dge") ? "Selected but no completed R output" : "Not selected");
  const selectedAnalysisNames = [...selected].map((id) => analysisLabels[id]).join(", ");
  const supportedWording = comparison?.runs.some((run) => run.method.id === "adjusted_ols")
    ? selected.has("purity")
      ? "In this synthetic melanoma fixture, the selected adjusted feature model estimates response associations conditional on the declared covariates, and the selected higher-purity sensitivity preserves the program direction."
      : "In this synthetic melanoma fixture, the selected adjusted feature model estimates response associations conditional on the declared clinical and technical covariates."
    : comparison
      ? "In this synthetic melanoma fixture, the selected unadjusted DGE method or methods describe response-group differences but do not answer the conditional covariate-adjusted question."
      : selected.has("purity")
        ? "In this synthetic melanoma fixture, the selected tumor-purity sensitivity reports how the adjusted program estimate changes after the declared restriction."
        : selected.has("programs")
          ? "In this synthetic melanoma fixture, the selected TME module summarizes coordinated adjusted expression effects without claiming immune-cell abundance."
          : "In this synthetic melanoma fixture, the selected neural module reports internal predictive performance without claiming mechanism or external validity.";
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  doc.setFillColor(7, 12, 13);
  doc.rect(0, 0, 210, 72, "F");
  doc.setTextColor(137, 202, 179);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BIOTRUST AI / SYNTHETIC WORKED RESEARCH CASE", 16, 15);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("Melanoma tumor microenvironment", 16, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(201, 213, 211);
  doc.text("From researcher question to auditable interpretation", 16, 43);
  doc.setFontSize(8);
  doc.setTextColor(142, 162, 160);
  doc.text(`${result.execution_id} | fixed seed ${result.seed} | synthetic data only`, 16, 60);

  doc.setFillColor(232, 244, 239);
  doc.roundedRect(16, 81, 178, 18, 2, 2, "F");
  label(doc, "Synthetic demonstration - no real patients, genes, or clinical result", 21, 89);
  paragraph(doc, "All samples, covariates, expression counts, response labels, and results were generated procedurally for education.", 21, 95, 168, 7.5, [50, 91, 78]);

  section(doc, "Researcher question", 112);
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...ink);
  const question = plan?.research_question || melanomaResearchQuestion;
  doc.text(doc.splitTextToSize(question, 174), 18, 124);

  section(doc, "Accepted analysis proposal", 160);
  autoTable(doc, {
    startY: 168,
    margin: { left: 16, right: 16 },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.8, textColor: muted, lineColor: line, lineWidth: 0.1, valign: "top" },
    columnStyles: { 0: { cellWidth: 39, fontStyle: "bold", textColor: ink, fillColor: pale }, 1: { cellWidth: 139 } },
    body: [
      ["Selected analyses", selectedAnalysisNames],
      ["Selected DGE methods", selected.has("dge") ? selectedDgeNames : "DGE not selected"],
      ["Selected R methods", selected.has("r_dge") ? selectedRNames : "R package DGE not selected"],
      ["Declared covariates", "Age, recorded sex, stage, biopsy site, prior therapy, tumor purity, and sequencing batch"],
      ["Purity setting", selected.has("purity") ? `Repeat the adjusted program model among tumors with purity >= ${purityThreshold.toFixed(2)}.` : "Tumor-purity sensitivity not selected"],
      ["Decision record", "The local guide advised on suitability; the researcher selected and confirmed every executed module and method."],
    ],
  });

  const page1Y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  label(doc, "Claim ceiling", 16, page1Y);
  paragraph(doc, "Association in this synthetic fixture only. Not causation, patient benefit, cell abundance, biomarker validation, or clinical utility.", 16, page1Y + 6, 178, 8, [123, 66, 60]);

  if (comparison) {
    doc.addPage();
    section(doc, comparison.runs.length > 1 ? "Researcher-selected DGE comparison" : "Researcher-selected DGE method", 17);
    paragraph(doc, comparison.runs.length > 1 ? "Every selected method used the same synthetic samples, feature universe, log2 CPM matrix, response labels, and Benjamini-Hochberg threshold. Method agreement is not replication; it is sensitivity evidence." : "The selected method used the declared synthetic samples, feature universe, log2 CPM matrix, response labels, and Benjamini-Hochberg threshold.", 16, 27, 178, 7.6);
    autoTable(doc, {
      startY: 34,
      margin: { left: 16, right: 16 },
      styles: { font: "helvetica", fontSize: 7.2, cellPadding: 2.5, textColor: muted, lineColor: line, lineWidth: 0.1 },
      headStyles: { fillColor: [24, 62, 56], textColor: [255, 255, 255] },
      head: [["Method", "Role", "Covariate adjusted", "FDR < 0.05", "Higher", "Lower"]],
      body: comparison.runs.map((run) => [run.method.short_name, run.method.role, run.method.adjusts_covariates ? "Yes" : "No", String(run.significant_count), String(run.positive_count), String(run.negative_count)]),
    });
    let recommendY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    if (comparison.pairwise.length > 0) {
      section(doc, "Pairwise agreement", recommendY);
      autoTable(doc, {
        startY: recommendY + 8,
        margin: { left: 16, right: 16 },
        styles: { font: "helvetica", fontSize: 7.2, cellPadding: 2.5, textColor: muted, lineColor: line, lineWidth: 0.1 },
        headStyles: { fillColor: [32, 54, 61], textColor: [255, 255, 255] },
        head: [["Method pair", "Effect-rank rho", "Sign agreement", "Top-50 overlap", "FDR overlap"]],
        body: comparison.pairwise.map((pair) => [`${pair.method_a} vs ${pair.method_b}`, fmt(pair.effect_spearman, 3), `${fmt(100 * pair.sign_concordance, 1)}%`, `${pair.top_50_overlap} / 50`, String(pair.fdr_overlap)]),
      });
      recommendY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    } else {
      label(doc, "No comparison requested", 16, recommendY);
      paragraph(doc, "One DGE method was selected, so no rank, sign, top-feature, or FDR-overlap statistics were calculated.", 16, recommendY + 7, 178, 7.5);
      recommendY += 22;
    }
    section(doc, "Method recommendation", recommendY);
    label(doc, comparison.recommendation.title, 16, recommendY + 10);
    paragraph(doc, comparison.recommendation.rationale.map((reason, index) => `${index + 1}. ${reason}`).join("  "), 16, recommendY + 17, 178, 8, ink);
    paragraph(doc, comparison.recommendation.caution, 16, recommendY + 35, 178, 7.5, [126, 77, 51]);
  }

  if (neural && selected.has("neural")) {
    doc.addPage();
    section(doc, "Researcher-selected neural integration", 17);
    paragraph(doc, "This module connects synthetic program scores and covariates for internal prediction. It remains separate from statistical association evidence.", 16, 27, 178, 7.6);
    autoTable(doc, {
      startY: 37,
      margin: { left: 16, right: 16 },
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 3.2, textColor: muted, lineColor: line, lineWidth: 0.1 },
      columnStyles: { 0: { fontStyle: "bold", fillColor: pale, textColor: ink }, 2: { fontStyle: "bold", fillColor: pale, textColor: ink } },
      body: [
        ["Cross-validated AUROC", fmt(neural.auc, 3), "Balanced accuracy", `${fmt(100 * neural.balanced_accuracy, 1)}%`],
        ["Brier score", fmt(neural.brier_score, 3), "Architecture", neural.architecture],
        ["Folds", String(neural.folds), "Epochs per fold", String(neural.epochs_per_fold)],
      ],
    });
    const importanceY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 13;
    section(doc, "Highest normalized weight-path sensitivities", importanceY);
    autoTable(doc, {
      startY: importanceY + 8,
      margin: { left: 16, right: 16 },
      styles: { font: "helvetica", fontSize: 7.4, cellPadding: 2.5, textColor: muted, lineColor: line, lineWidth: 0.1 },
      headStyles: { fillColor: [32, 54, 61], textColor: [255, 255, 255] },
      head: [["Input", "Normalized sensitivity"]],
      body: neural.importance.slice(0, 10).map((item) => [item.feature, `${fmt(100 * item.importance, 1)}%`]),
    });
    const neuralBoundaryY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    section(doc, "Interpretation boundary", neuralBoundaryY);
    paragraph(doc, "Internal cross-validation is not external replication. Weight-path sensitivity is not causal or biological importance, and neural performance does not validate a clinical biomarker.", 16, neuralBoundaryY + 9, 178, 8, [126, 66, 59]);
  }

  if (rExecution && selected.has("r_dge")) {
    doc.addPage();
    section(doc, "Genuine R package execution", 17);
    paragraph(doc, "The synthetic matrix was copied into the browser-local webR filesystem and processed by the selected R stats package functions. No matrix was uploaded.", 16, 27, 178, 7.6);
    autoTable(doc, {
      startY: 37,
      margin: { left: 16, right: 16 },
      styles: { font: "helvetica", fontSize: 7.4, cellPadding: 2.6, textColor: muted, lineColor: line, lineWidth: 0.1 },
      headStyles: { fillColor: [24, 62, 56], textColor: [255, 255, 255] },
      head: [["R method", "Package", "Function", "Adjusted", "FDR < 0.05", "Higher", "Lower"]],
      body: rExecution.methods.map((run) => [run.method.short_name, `${run.method.package_name} ${rExecution.package_versions[run.method.package_name]}`, run.method.function_name, run.method.adjusts_covariates ? "Yes" : "No", String(run.significant_count), String(run.positive_count), String(run.negative_count)]),
    });
    const rMetadataY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    label(doc, "Runtime", 16, rMetadataY);
    paragraph(doc, `${rExecution.r_version} | ${rExecution.engine}`, 16, rMetadataY + 7, 178, 8, ink);
    const preferredRRun = rExecution.methods.find((run) => run.method.id === "r_adjusted_lm") ?? rExecution.methods[0];
    section(doc, `Top results - ${preferredRRun.method.short_name}`, rMetadataY + 20);
    autoTable(doc, {
      startY: rMetadataY + 28,
      margin: { left: 12, right: 12 },
      styles: { font: "helvetica", fontSize: 6.6, cellPadding: 2, textColor: muted, lineColor: line, lineWidth: 0.1 },
      headStyles: { fillColor: [32, 54, 61], textColor: [255, 255, 255] },
      head: [["Feature", "Program", "Effect", "R statistic", "p-value", "BH FDR"]],
      body: preferredRRun.results.slice(0, 12).map((row) => [row.feature_id, row.program, fmt(row.response_effect, 3), fmt(row.statistic), fmtP(row.p_value), fmtP(row.adjusted_p_value)]),
    });
    const rBoundaryY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 11;
    label(doc, "Execution boundary", 16, rBoundaryY, [151, 70, 60]);
    paragraph(doc, "These are genuine R stats package results from transformed counts. They are not edgeR or DESeq2 and do not establish external replication.", 16, rBoundaryY + 7, 178, 7.4, [126, 66, 59]);
  }

  doc.addPage();
  section(doc, "Synthetic cohort and declared variables", 17);
  autoTable(doc, {
    startY: 25,
    margin: { left: 16, right: 16 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.3, cellPadding: 2.3, textColor: muted, lineColor: line, lineWidth: 0.1, valign: "top" },
    headStyles: { fillColor: [24, 62, 56], textColor: [255, 255, 255], fontStyle: "bold" },
    head: [["Variable", "Encoding", "Role", "Reference / scale"]],
    body: [
      ["Response", "Binary", "Target association", "Non-responder reference"],
      ["Age", "Continuous", "Clinical composition", "Centered 60, per 10 years"],
      ["Recorded sex", "Indicator", "Cohort composition", "Female reference"],
      ["Disease stage", "Indicator", "Disease extent", "Stage III reference"],
      ["Biopsy site", "2 indicators", "Tissue context", "Skin reference"],
      ["Prior therapy", "Indicator", "Treatment history", "No reference"],
      ["Tumor purity", "Continuous", "Bulk mixture structure", "Synthetic fraction"],
      ["Batch", "2 indicators", "Technical structure", "Batch 1 reference"],
    ],
  });

  const cohortY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: cohortY,
    margin: { left: 16, right: 16 },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.5, textColor: muted, lineColor: line, lineWidth: 0.1 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: pale, textColor: ink }, 2: { fontStyle: "bold", fillColor: pale, textColor: ink } },
    body: [
      ["Samples", String(result.dataset.sample_count), "Responders", String(result.dataset.responder_count)],
      ["Non-responders", String(result.dataset.non_responder_count), "Features", result.dataset.feature_count.toLocaleString()],
      ["Median purity", fmt(result.dataset.median_purity), "Design columns", "11 after dummy encoding"],
    ],
  });

  let selectedOutputY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 13;
  if (selected.has("purity")) {
    section(doc, "Selected tumor-purity sensitivity", selectedOutputY);
    autoTable(doc, {
      startY: selectedOutputY + 8,
      margin: { left: 16, right: 16 },
      styles: { font: "helvetica", fontSize: 7.2, cellPadding: 2.4, textColor: muted, lineColor: line, lineWidth: 0.1 },
      headStyles: { fillColor: [24, 62, 56], textColor: [255, 255, 255] },
      head: [["Model", "n", "Effect", "95% interval", "p-value"]],
      body: [result.primary, result.sensitivity].map((model) => [model.label, String(model.sample_count), fmt(model.response_effect), `${fmt(model.confidence_low)} to ${fmt(model.confidence_high)}`, fmtP(model.p_value)]),
    });
    selectedOutputY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }
  if (selected.has("programs")) {
    section(doc, "Selected TME program summary", selectedOutputY);
    autoTable(doc, {
      startY: selectedOutputY + 8,
      margin: { left: 16, right: 16 },
      styles: { font: "helvetica", fontSize: 7.2, cellPadding: 2.1, textColor: muted, lineColor: line, lineWidth: 0.1 },
      headStyles: { fillColor: [32, 54, 61], textColor: [255, 255, 255] },
      head: [["Program", "Features", "Mean adjusted effect", "FDR < 0.05"]],
      body: result.program_summaries.map((program) => [program.program, String(program.feature_count), fmt(program.mean_response_effect, 3), String(program.fdr_significant_features)]),
    });
    selectedOutputY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }
  if (!selected.has("purity") && !selected.has("programs")) {
    section(doc, "Plan boundary", selectedOutputY);
    paragraph(doc, "No tumor-purity sensitivity or TME program summary was selected. This page records the dataset structure only.", 16, selectedOutputY + 9, 178, 8);
  }

  if (comparison) {
    doc.addPage();
    section(doc, "Top results from the recommended selected method", 17);
    paragraph(doc, "Generic feature IDs are used so the synthetic result cannot be mistaken for real gene evidence.", 16, 27, 178, 7.5);
    autoTable(doc, {
      startY: 33,
      margin: { left: 12, right: 12 },
      styles: { font: "helvetica", fontSize: 6.6, cellPadding: 2, textColor: muted, lineColor: line, lineWidth: 0.1 },
      headStyles: { fillColor: [24, 62, 56], textColor: [255, 255, 255] },
      head: [["Feature", "Program", "Effect", "Statistic", "p-value", "BH FDR"]],
      body: displayedFeatureResults.slice(0, 15).map((row) => [row.feature_id, row.program, fmt(row.response_effect, 3), fmt(row.statistic), fmtP(row.p_value), fmtP(row.adjusted_p_value)]),
    });
  }

  doc.addPage();
  section(doc, "Evidence synthesis - selected analyses only", 17);
  label(doc, interpretation.generated_by, 16, 28);
  paragraph(doc, interpretation.summary, 16, 35, 178, 8.2, ink);
  autoTable(doc, {
    startY: 55,
    margin: { left: 12, right: 12 },
    styles: { font: "helvetica", fontSize: 6.6, cellPadding: 2.2, textColor: muted, lineColor: line, lineWidth: 0.1, valign: "top" },
    headStyles: { fillColor: [32, 54, 61], textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 12, fontStyle: "bold" }, 1: { cellWidth: 31, fontStyle: "bold" }, 2: { cellWidth: 61 }, 3: { cellWidth: 82 } },
    head: [["ID", "Connection", "Finding", "Implication"]],
    body: interpretation.connections.map((connection) => [connection.id, connection.title, connection.finding, connection.implication]),
  });

  doc.addPage();
  section(doc, "Interpretation boundary", 17);
  doc.setFillColor(232, 244, 239);
  doc.roundedRect(16, 26, 178, 38, 2, 2, "F");
  label(doc, "Supported wording", 21, 35);
  paragraph(doc, supportedWording, 21, 42, 166, 8.4, [35, 77, 65]);
  doc.setFillColor(249, 236, 233);
  doc.roundedRect(16, 69, 178, 33, 2, 2, "F");
  label(doc, "Not established", 21, 78, [151, 70, 60]);
  paragraph(doc, "Causation; treatment benefit for a real patient; a validated clinical biomarker; measured T-cell abundance; mechanism; or external replication.", 21, 85, 166, 8.2, [126, 66, 59]);

  section(doc, "Reproducibility record", 117);
  autoTable(doc, {
    startY: 125,
    margin: { left: 16, right: 16 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.2, cellPadding: 2.5, textColor: muted, lineColor: line, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 46, fontStyle: "bold", fillColor: pale, textColor: ink }, 1: { cellWidth: 132, font: "courier" } },
    body: [
      ["Execution ID", result.execution_id],
      ["Seed", String(result.seed)],
      ["Metadata checksum", result.hashes.metadata],
      ["Counts checksum", result.hashes.counts],
      ["Results checksum", result.hashes.results],
      ["Checksum algorithm", result.hashes.algorithm],
      ["Selected analyses", selectedAnalysisNames],
      ["Selected browser DGE", selected.has("dge") ? selectedDgeNames : "Not selected"],
      ["Selected R methods", selected.has("r_dge") ? selectedRNames : "Not selected"],
      ["Production recommendation", "edgeR quasi-likelihood + CAMERA in a controlled R runner"],
    ],
  });

  const checklistY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 11;
  section(doc, "Researcher review checklist", checklistY);
  const checks = [
    "[ ] I verified the accepted estimand and all reference levels.",
    "[ ] I reviewed model diagnostics, interactions, nonlinearity, and influential samples.",
    "[ ] I did not interpret a program score as immune-cell abundance.",
    "[ ] I kept association separate from causation and clinical utility.",
    "[ ] I will require a locked independent cohort before claiming replication.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.7);
  doc.setTextColor(...muted);
  checks.forEach((check, index) => doc.text(check, 18, checklistY + 11 + index * 8));

  label(doc, "Scientific basis", 16, 268);
  paragraph(doc, "Ayers et al., JCI 2017; Aran et al., Nature Communications 2015; edgeR User's Guide; Wu and Smyth, Nucleic Acids Research 2012. These sources motivate design choices; they do not validate the synthetic output.", 16, 274, 178, 6.8);

  footer(doc);
  return doc;
}

export function downloadMelanomaReport(result: MelanomaAnalysisResult, options: MelanomaReportOptions = {}) {
  createMelanomaReport(result, options).save("biotrust-synthetic-melanoma-analysis-report.pdf");
}
