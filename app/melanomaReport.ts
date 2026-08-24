import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildMelanomaInterpretation, type MelanomaAnalysisResult } from "./melanomaDemo.ts";

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

export function createMelanomaReport(result: MelanomaAnalysisResult, purityThreshold = 0.5): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const interpretation = buildMelanomaInterpretation(result);

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
  const question = "In baseline melanoma tumors, is a stronger T-cell-inflamed expression program associated with response to PD-1 blockade after accounting for age, recorded sex, disease stage, biopsy site, prior systemic therapy, tumor purity, and sequencing batch?";
  doc.text(doc.splitTextToSize(question, 174), 18, 124);

  section(doc, "Accepted analysis proposal", 160);
  autoTable(doc, {
    startY: 168,
    margin: { left: 16, right: 16 },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.8, textColor: muted, lineColor: line, lineWidth: 0.1, valign: "top" },
    columnStyles: { 0: { cellWidth: 39, fontStyle: "bold", textColor: ink, fillColor: pale }, 1: { cellWidth: 139 } },
    body: [
      ["Estimand", "Adjusted mean difference in a predeclared T-cell-inflamed expression score between synthetic response groups."],
      ["Primary model", "Score ~ response + age + recorded sex + stage + biopsy site + prior therapy + tumor purity + batch"],
      ["Sensitivity", `Repeat the full model among synthetic tumors with purity >= ${purityThreshold.toFixed(2)}.`],
      ["Feature screen", "1,200 log2 CPM feature models with Benjamini-Hochberg adjustment across all features."],
      ["Decision record", "AI_CHOICE proposed the plan; USER_CHOICE accepted it before data generation and execution."],
    ],
  });

  const page1Y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  label(doc, "Claim ceiling", 16, page1Y);
  paragraph(doc, "Association in this synthetic fixture only. Not causation, patient benefit, cell abundance, biomarker validation, or clinical utility.", 16, page1Y + 6, 178, 8, [123, 66, 60]);

  doc.addPage();
  section(doc, "Synthetic cohort and multivariable design", 17);
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

  const modelY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 13;
  section(doc, "Executed model comparison", modelY);
  autoTable(doc, {
    startY: modelY + 8,
    margin: { left: 16, right: 16 },
    styles: { font: "helvetica", fontSize: 7.2, cellPadding: 2.4, textColor: muted, lineColor: line, lineWidth: 0.1 },
    headStyles: { fillColor: [24, 62, 56], textColor: [255, 255, 255] },
    head: [["Model", "n", "Effect", "95% interval", "p-value"]],
    body: [result.naive, result.primary, result.sensitivity].map((model) => [model.label, String(model.sample_count), fmt(model.response_effect), `${fmt(model.confidence_low)} to ${fmt(model.confidence_high)}`, fmtP(model.p_value)]),
  });

  const programY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  section(doc, "Program-level pattern", programY);
  autoTable(doc, {
    startY: programY + 8,
    margin: { left: 16, right: 16 },
    styles: { font: "helvetica", fontSize: 7.2, cellPadding: 2.1, textColor: muted, lineColor: line, lineWidth: 0.1 },
    headStyles: { fillColor: [32, 54, 61], textColor: [255, 255, 255] },
    head: [["Program", "Features", "Mean adjusted effect", "FDR < 0.05"]],
    body: result.program_summaries.map((program) => [program.program, String(program.feature_count), fmt(program.mean_response_effect, 3), String(program.fdr_significant_features)]),
  });

  doc.addPage();
  section(doc, "Top feature-level results", 17);
  paragraph(doc, "Generic feature IDs are used so the synthetic result cannot be mistaken for real gene evidence.", 16, 27, 178, 7.5);
  autoTable(doc, {
    startY: 33,
    margin: { left: 12, right: 12 },
    styles: { font: "helvetica", fontSize: 6.6, cellPadding: 2, textColor: muted, lineColor: line, lineWidth: 0.1 },
    headStyles: { fillColor: [24, 62, 56], textColor: [255, 255, 255] },
    head: [["Feature", "Program", "Effect", "Statistic", "p-value", "BH FDR"]],
    body: result.feature_results.slice(0, 15).map((row) => [row.feature_id, row.program, fmt(row.response_effect, 3), fmt(row.statistic), fmtP(row.p_value), fmtP(row.adjusted_p_value)]),
  });

  const synthesisY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  section(doc, "Evidence synthesis engine", synthesisY);
  label(doc, `${interpretation.generated_by} / neural adapter ${interpretation.neural_adapter_status}`, 16, synthesisY + 9);
  paragraph(doc, interpretation.summary, 16, synthesisY + 15, 178, 8.2, ink);
  autoTable(doc, {
    startY: synthesisY + 32,
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
  paragraph(doc, "In this synthetic melanoma fixture, the predeclared T-cell-inflamed expression score was higher in synthetic responders after multivariable adjustment, and the direction persisted in the higher-purity sensitivity subset.", 21, 42, 166, 8.4, [35, 77, 65]);
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
      ["Browser method", "log2 CPM + OLS + normal approximation + BH FDR"],
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

export function downloadMelanomaReport(result: MelanomaAnalysisResult, purityThreshold = 0.5) {
  createMelanomaReport(result, purityThreshold).save("biotrust-synthetic-melanoma-tme-report.pdf");
}

