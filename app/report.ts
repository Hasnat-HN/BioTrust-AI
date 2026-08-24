import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildDecisionTrail, methodName, methodRationale, type AnalysisReportOptions } from "./decisionTrail.ts";

export type { AnalysisReportOptions, ReportExecutionResult } from "./decisionTrail.ts";

const formatNumber = (value: number | null) => {
  if (value === null) return "NA";
  if (value !== 0 && Math.abs(value) < 0.001) return value.toExponential(2);
  return value.toFixed(3);
};

const sectionTitle = (doc: jsPDF, title: string, y: number) => {
  doc.setFillColor(20, 82, 72);
  doc.rect(16, y - 4, 3, 8, "F");
  doc.setTextColor(25, 49, 57);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 23, y + 2);
};

const safeDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
};

export function createAnalysisReport(options: AnalysisReportOptions): jsPDF {
  const { result, isSynthetic } = options;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const trail = buildDecisionTrail(options);
  const significant = result.results.filter((row) => row.adjusted_p_value !== null && row.adjusted_p_value < 0.05).length;
  const title = options.projectName ?? (isSynthetic ? "Synthetic transcriptomic association study" : "Controlled RNA-seq analysis");

  doc.setFillColor(18, 44, 56);
  doc.rect(0, 0, 210, 55, "F");
  doc.setTextColor(219, 237, 232);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BIOTRUST AI  /  AUDITABLE ANALYSIS REPORT", 16, 15);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(23);
  doc.text(title, 16, 29, { maxWidth: 174 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(178, 204, 213);
  doc.text(`${result.execution_id}  |  ${safeDate(result.generated_at)}`, 16, 47);

  doc.setFillColor(isSynthetic ? 231 : 226, isSynthetic ? 242 : 241, isSynthetic ? 247 : 236);
  doc.roundedRect(16, 63, 178, 19, 2, 2, "F");
  doc.setTextColor(isSynthetic ? 32 : 30, isSynthetic ? 93 : 92, isSynthetic ? 121 : 73);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(isSynthetic ? "SYNTHETIC DEMONSTRATION — NOT A BIOLOGICAL OR CLINICAL RESULT" : "CONTROLLED REAL-DATA EXECUTION — REQUIRES RESEARCHER REVIEW", 21, 71);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(isSynthetic ? "The values below are generic and exist only to demonstrate the workflow." : "Statistical output does not establish causality, mechanism, diagnosis, or clinical utility.", 21, 77);

  sectionTitle(doc, "Analysis summary", 94);
  autoTable(doc, {
    startY: 101,
    theme: "plain",
    margin: { left: 16, right: 16 },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, textColor: [53, 72, 68], lineColor: [220, 229, 225], lineWidth: 0.1 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [241, 246, 244], cellWidth: 40 }, 1: { cellWidth: 44 }, 2: { fontStyle: "bold", fillColor: [241, 246, 244], cellWidth: 40 }, 3: { cellWidth: 44 } },
    body: [
      ["Comparison", `${result.comparison} vs ${result.reference}`, "Samples", String(result.sample_count)],
      ["Method", methodName(result.method), "Retained features", result.retained_feature_count.toLocaleString()],
      ["Design", result.design, "Adjusted p < 0.05", String(significant)],
      ["Dataset", options.datasetName ?? (isSynthetic ? "Synthetic_Cohort" : "Researcher dataset"), "Status", result.status.toUpperCase()],
    ],
  });

  const summaryY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 13;
  sectionTitle(doc, "Question and method rationale", summaryY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(41, 65, 61);
  doc.text("Declared research question", 16, summaryY + 11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(77, 94, 90);
  doc.text(doc.splitTextToSize(options.researchQuestion ?? `Which features differ between ${result.comparison} and ${result.reference} under the declared design?`, 178), 16, summaryY + 17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 65, 61);
  doc.text("Why this method", 16, summaryY + 31);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(77, 94, 90);
  doc.text(doc.splitTextToSize(methodRationale(result.method), 178), 16, summaryY + 37);

  doc.addPage();
  sectionTitle(doc, "Auditable decision trail", 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(92, 107, 103);
  doc.text("This records visible decisions and evidence. It is not hidden AI chain-of-thought.", 16, 27);
  autoTable(doc, {
    startY: 33,
    head: [["Process", "What happened", "Why it matters", "Evidence / review state"]],
    body: trail.map((entry) => [entry.process, entry.whatHappened, entry.whyItMatters, `${entry.evidence}\n[${entry.status}]`]),
    margin: { left: 10, right: 10 },
    styles: { font: "helvetica", fontSize: 6.8, cellPadding: 2.2, valign: "top", textColor: [56, 73, 69], lineColor: [215, 225, 221], lineWidth: 0.1, overflow: "linebreak" },
    headStyles: { fillColor: [18, 68, 66], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 249, 248] },
    columnStyles: { 0: { cellWidth: 27, fontStyle: "bold" }, 1: { cellWidth: 47 }, 2: { cellWidth: 47 }, 3: { cellWidth: 47 } },
  });

  doc.addPage();
  sectionTitle(doc, "Result preview", 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(92, 107, 103);
  doc.text(`Top ${Math.min(result.results.length, 25)} rows in adjusted-p-value order. The CSV export remains the complete machine-readable table.`, 16, 27);
  autoTable(doc, {
    startY: 33,
    head: [["Feature", "log2 fold change", "Statistic", "p-value", "Adjusted p-value"]],
    body: result.results.slice(0, 25).map((row) => [row.feature_id, formatNumber(row.log2_fold_change), formatNumber(row.statistic), formatNumber(row.p_value), formatNumber(row.adjusted_p_value)]),
    margin: { left: 16, right: 16 },
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.3, textColor: [56, 73, 69], lineColor: [218, 227, 223], lineWidth: 0.1, halign: "right" },
    headStyles: { fillColor: [27, 57, 68], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 249, 248] },
    columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
  });

  const resultY = Math.min((doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 13, 226);
  sectionTitle(doc, "Interpretation boundaries", resultY);
  const limitations = [
    "Adjusted p-values address multiplicity; they do not measure biological importance or replication.",
    "Association does not establish causality, mechanism, temporal progression, diagnosis, or treatment effect.",
    "Review sample quality, dispersion, model rank, influential observations, and sensitivity analyses before publication.",
    ...(result.warnings.length ? result.warnings : []),
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(75, 91, 87);
  limitations.forEach((item, index) => doc.text(doc.splitTextToSize(`• ${item}`, 174), 18, resultY + 11 + index * 10));

  doc.addPage();
  sectionTitle(doc, "Reproducibility and provenance", 17);
  const provenanceRows = [
    ["Execution ID", result.execution_id],
    ["Generated", safeDate(result.generated_at)],
    ["Method", `${methodName(result.method)} (${result.method})`],
    ["Design", result.design],
    ...Object.entries(result.software_versions).map(([name, version]) => [`Software: ${name}`, version]),
    ...Object.entries(result.input_hashes).map(([name, hash]) => [`Input hash: ${name}`, hash]),
    ["Output hash", result.output_hash],
  ];
  autoTable(doc, {
    startY: 25,
    body: provenanceRows,
    theme: "grid",
    margin: { left: 16, right: 16 },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 3, textColor: [54, 72, 68], lineColor: [214, 225, 220], lineWidth: 0.1, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", fillColor: [241, 246, 244] }, 1: { cellWidth: 120, font: "courier" } },
  });

  const provenanceY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  sectionTitle(doc, "Researcher review checklist", provenanceY);
  const checklist = [
    "[ ] I verified the dataset and sample selection.",
    "[ ] I confirmed the exact design, contrast, and covariates.",
    "[ ] I reviewed quality diagnostics and sensitivity analyses.",
    "[ ] I checked that each claim stays within the evidence boundary.",
    "[ ] I obtained independent statistical review where required.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(62, 80, 75);
  checklist.forEach((item, index) => doc.text(item, 18, provenanceY + 12 + index * 10));

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(218, 227, 223);
    doc.line(16, 285, 194, 285);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(122, 136, 132);
    doc.text("BioTrust AI research software — not medical advice or a substitute for statistical review", 16, 290);
    doc.text(`Page ${page} of ${pageCount}`, 194, 290, { align: "right" });
  }

  return doc;
}

export function downloadAnalysisReport(options: AnalysisReportOptions): void {
  createAnalysisReport(options).save(`${options.result.execution_id}-scientific-report.pdf`);
}
