import { getWebRRuntime } from "./webRAnalysis.ts";

export type UserAnalysisMethodId =
  | "js_adjusted_ols"
  | "js_welch"
  | "js_wilcoxon"
  | "r_adjusted_ols"
  | "r_welch"
  | "r_wilcoxon";

export type UserAnalysisMethod = {
  id: UserAnalysisMethodId;
  name: string;
  shortName: string;
  engine: "JavaScript" | "R stats";
  role: string;
  adjustsCovariates: boolean;
  description: string;
  boundary: string;
};

export const userAnalysisMethods: UserAnalysisMethod[] = [
  {
    id: "js_adjusted_ols",
    name: "Adjusted log-CPM model",
    shortName: "JS adjusted OLS",
    engine: "JavaScript",
    role: "Question-matched browser model",
    adjustsCovariates: true,
    description: "Estimates the comparison effect after the covariates you selected.",
    boundary: "Transformed-count linear model; not edgeR or DESeq2.",
  },
  {
    id: "r_adjusted_ols",
    name: "R adjusted log-CPM model",
    shortName: "R adjusted OLS",
    engine: "R stats",
    role: "Genuine R verification",
    adjustsCovariates: true,
    description: "Runs model-matrix and linear-model algebra in R with the same declared design.",
    boundary: "Real R execution, but still a transformed-count model.",
  },
  {
    id: "js_welch",
    name: "Welch two-group screen",
    shortName: "JS Welch",
    engine: "JavaScript",
    role: "Parametric sensitivity screen",
    adjustsCovariates: false,
    description: "Compares mean log-CPM while allowing unequal group variances.",
    boundary: "Unadjusted; cannot answer a conditional question.",
  },
  {
    id: "r_welch",
    name: "R Welch two-group screen",
    shortName: "R Welch",
    engine: "R stats",
    role: "Genuine R sensitivity screen",
    adjustsCovariates: false,
    description: "Runs the Welch statistic and t-distribution p-value in R.",
    boundary: "Unadjusted; agreement is not external validation.",
  },
  {
    id: "js_wilcoxon",
    name: "Wilcoxon rank-sum screen",
    shortName: "JS Wilcoxon",
    engine: "JavaScript",
    role: "Rank-based sensitivity screen",
    adjustsCovariates: false,
    description: "Compares expression-rank distributions between the two groups.",
    boundary: "Different estimand and no covariate adjustment.",
  },
  {
    id: "r_wilcoxon",
    name: "R Wilcoxon rank-sum screen",
    shortName: "R Wilcoxon",
    engine: "R stats",
    role: "Genuine R rank-based screen",
    adjustsCovariates: false,
    description: "Runs stats::wilcox.test for every retained feature in R.",
    boundary: "Can be slower on large matrices and does not adjust covariates.",
  },
];

export type UserDataset = {
  countsFileName: string;
  metadataFileName: string;
  featureIds: string[];
  sampleIds: string[];
  counts: number[][];
  metadata: Array<Record<string, string>>;
  metadataColumns: string[];
  sampleIdColumn: string;
  categoricalColumns: string[];
  numericColumns: string[];
  summary: {
    samples: number;
    features: number;
    cells: number;
    zeroRate: number;
    integerNonnegative: boolean;
    libraryMinimum: number;
    libraryMedian: number;
    libraryMaximum: number;
    libraryHistogram: Array<{ label: string; count: number }>;
  };
};

export type UserAnalysisSetup = {
  question: string;
  conditionColumn: string;
  referenceLevel: string;
  comparisonLevel: string;
  covariates: string[];
  methods: UserAnalysisMethodId[];
};

export type UserFeatureResult = {
  featureId: string;
  effect: number;
  statistic: number;
  pValue: number;
  adjustedPValue: number;
};

export type UserMethodRun = {
  method: UserAnalysisMethod;
  results: UserFeatureResult[];
  significantCount: number;
  positiveCount: number;
  negativeCount: number;
  software: string;
};

export type UserMethodComparison = {
  methodA: UserAnalysisMethodId;
  methodB: UserAnalysisMethodId;
  signAgreement: number;
  topFeatureOverlap: number;
  fdrOverlap: number;
};

export type UserAnalysisOutput = {
  executionId: string;
  generatedAt: string;
  inputHashes: { countsSha256: string; metadataSha256: string };
  outputHash: string;
  setup: UserAnalysisSetup;
  sampleCount: number;
  featureCount: number;
  groupCounts: Record<string, number>;
  runs: UserMethodRun[];
  comparisons: UserMethodComparison[];
  recommendation: {
    methodId: UserAnalysisMethodId;
    title: string;
    reasons: string[];
    caution: string;
  };
  warnings: string[];
};

function delimiterFromHeader(text: string): string {
  const header = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", "\t", ";"];
  const counts = candidates.map((delimiter) => {
    let quoted = false;
    let count = 0;
    for (let index = 0; index < header.length; index += 1) {
      if (header[index] === '"') quoted = !quoted;
      if (!quoted && header[index] === delimiter) count += 1;
    }
    return { delimiter, count };
  });
  return counts.sort((left, right) => right.count - left.count)[0].delimiter;
}

function parseDelimited(text: string): string[][] {
  const delimiter = delimiterFromHeader(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }
  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (quoted) throw new Error("A quoted CSV field was not closed.");
  return rows;
}

function assertUnique(values: string[], label: string): void {
  const duplicate = values.find((value, index) => !value || values.indexOf(value) !== index);
  if (duplicate !== undefined) throw new Error(duplicate ? `${label} contains the duplicate value “${duplicate}”.` : `${label} contains an empty value.`);
}

const median = (values: number[]) => {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

function libraryHistogram(values: number[]): Array<{ label: string; count: number }> {
  const logs = values.map((value) => Math.log10(Math.max(1, value)));
  const minimum = Math.min(...logs);
  const maximum = Math.max(...logs);
  const bins = 8;
  const width = (maximum - minimum || 1) / bins;
  const counts = Array.from({ length: bins }, () => 0);
  logs.forEach((value) => { counts[Math.min(bins - 1, Math.floor((value - minimum) / width))] += 1; });
  return counts.map((count, index) => ({ label: `${(minimum + index * width).toFixed(1)}`, count }));
}

export function parseUserDataset(countsText: string, metadataText: string, countsFileName: string, metadataFileName: string): UserDataset {
  const countRows = parseDelimited(countsText);
  const metadataRows = parseDelimited(metadataText);
  if (countRows.length < 3 || countRows[0].length < 5) throw new Error("The count matrix needs a header, at least two features, and at least four samples.");
  if (metadataRows.length < 5 || metadataRows[0].length < 2) throw new Error("The metadata needs a header, at least four samples, and at least one study variable.");
  const countHeader = countRows[0];
  const sampleIds = countHeader.slice(1);
  assertUnique(sampleIds, "Count-matrix sample identifiers");
  const featureIds = countRows.slice(1).map((row) => row[0]);
  assertUnique(featureIds, "Feature identifiers");
  if (sampleIds.length > 500) throw new Error("The public browser workflow is limited to 500 samples. Use the controlled runner for a larger study.");
  if (featureIds.length > 5000) throw new Error("The public browser workflow is limited to 5,000 features. Filter the matrix or use the controlled runner.");
  const featureCounts = countRows.slice(1).map((row, rowIndex) => {
    if (row.length !== countHeader.length) throw new Error(`Count row ${rowIndex + 2} has ${row.length} columns; expected ${countHeader.length}.`);
    return row.slice(1).map((value) => {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) throw new Error(`Count matrix contains an invalid value at feature ${row[0]}.`);
      return number;
    });
  });
  const counts = sampleIds.map((_, sampleIndex) => featureCounts.map((row) => row[sampleIndex]));
  const libraries = counts.map((row) => row.reduce((total, value) => total + value, 0));
  if (libraries.some((value) => value <= 0)) throw new Error("Every sample must have a positive library size.");
  const metadataColumns = metadataRows[0];
  assertUnique(metadataColumns, "Metadata columns");
  const sampleIdColumn = metadataColumns.find((column) => column.toLowerCase() === "sample_id") ?? metadataColumns[0];
  const records = metadataRows.slice(1).map((row, rowIndex) => {
    if (row.length !== metadataColumns.length) throw new Error(`Metadata row ${rowIndex + 2} has ${row.length} columns; expected ${metadataColumns.length}.`);
    return Object.fromEntries(metadataColumns.map((column, columnIndex) => [column, row[columnIndex]]));
  });
  const metadataIds = records.map((record) => record[sampleIdColumn]);
  assertUnique(metadataIds, "Metadata sample identifiers");
  const recordById = new Map(records.map((record) => [record[sampleIdColumn], record]));
  const missingMetadata = sampleIds.filter((sampleId) => !recordById.has(sampleId));
  const extraMetadata = metadataIds.filter((sampleId) => !sampleIds.includes(sampleId));
  if (missingMetadata.length || extraMetadata.length) throw new Error(`Sample identifiers do not match (${missingMetadata.length} missing from metadata; ${extraMetadata.length} metadata-only).`);
  const metadata = sampleIds.map((sampleId) => recordById.get(sampleId)!);
  const studyColumns = metadataColumns.filter((column) => column !== sampleIdColumn);
  const numericColumns = studyColumns.filter((column) => metadata.every((record) => record[column] !== "" && Number.isFinite(Number(record[column]))));
  const categoricalColumns = studyColumns.filter((column) => {
    const levels = new Set(metadata.map((record) => record[column]));
    return !levels.has("") && levels.size >= 2 && levels.size <= Math.min(20, Math.floor(metadata.length / 2));
  });
  if (categoricalColumns.length === 0) throw new Error("Metadata needs at least one categorical column with two or more replicated groups.");
  const zeros = counts.reduce((total, row) => total + row.filter((value) => value === 0).length, 0);
  const integerNonnegative = counts.every((row) => row.every((value) => Number.isInteger(value) && value >= 0));
  return {
    countsFileName,
    metadataFileName,
    featureIds,
    sampleIds,
    counts,
    metadata,
    metadataColumns,
    sampleIdColumn,
    categoricalColumns,
    numericColumns,
    summary: {
      samples: sampleIds.length,
      features: featureIds.length,
      cells: sampleIds.length * featureIds.length,
      zeroRate: zeros / (sampleIds.length * featureIds.length),
      integerNonnegative,
      libraryMinimum: Math.min(...libraries),
      libraryMedian: median(libraries),
      libraryMaximum: Math.max(...libraries),
      libraryHistogram: libraryHistogram(libraries),
    },
  };
}

export function levelsFor(dataset: UserDataset, column: string): string[] {
  return [...new Set(dataset.metadata.map((record) => record[column]))].sort((left, right) => left.localeCompare(right));
}

export function validateUserSetup(dataset: UserDataset, setup: UserAnalysisSetup): string[] {
  const issues: string[] = [];
  if (!setup.question.trim()) issues.push("Write the scientific question you want this comparison to address.");
  if (!dataset.categoricalColumns.includes(setup.conditionColumn)) issues.push("Choose a replicated categorical outcome or condition column.");
  if (!setup.referenceLevel || !setup.comparisonLevel || setup.referenceLevel === setup.comparisonLevel) issues.push("Choose two different condition levels.");
  const levels = levelsFor(dataset, setup.conditionColumn);
  if (!levels.includes(setup.referenceLevel) || !levels.includes(setup.comparisonLevel)) issues.push("The selected contrast levels are not present in the condition column.");
  const counts = Object.fromEntries(levels.map((level) => [level, dataset.metadata.filter((record) => record[setup.conditionColumn] === level).length]));
  if ((counts[setup.referenceLevel] ?? 0) < 2 || (counts[setup.comparisonLevel] ?? 0) < 2) issues.push("Each selected group needs at least two samples.");
  if (setup.covariates.includes(setup.conditionColumn)) issues.push("The condition column cannot also be a covariate.");
  if (setup.covariates.some((column) => !dataset.metadataColumns.includes(column))) issues.push("One or more selected covariates are not present in the metadata.");
  const selectedMetadata = dataset.metadata.filter((record) => [setup.referenceLevel, setup.comparisonLevel].includes(record[setup.conditionColumn]));
  const parameters = 2 + setup.covariates.reduce((total, column) => {
    const values = selectedMetadata.map((record) => record[column]);
    if (values.some((value) => value === "")) return total + selectedMetadata.length;
    return total + (values.every((value) => Number.isFinite(Number(value))) ? 1 : Math.max(1, new Set(values).size - 1));
  }, 0);
  if (selectedMetadata.length > 0 && parameters >= selectedMetadata.length - 1) issues.push("The selected covariates create too many model parameters for the two chosen groups.");
  if (setup.methods.length === 0) issues.push("Choose at least one analysis method.");
  if (setup.covariates.length > 0 && !setup.methods.some((method) => userAnalysisMethods.find((item) => item.id === method)?.adjustsCovariates)) issues.push("Your question declares covariates, but every selected method is unadjusted.");
  return issues;
}

const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
const variance = (values: number[]) => {
  const center = mean(values);
  return values.reduce((total, value) => total + (value - center) ** 2, 0) / Math.max(1, values.length - 1);
};

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absolute);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-absolute * absolute));
  return 0.5 * (1 + erf);
}

function twoSidedNormalP(value: number): number {
  const z = Math.abs(value);
  if (z <= 5) return Math.max(Number.MIN_VALUE, 2 * (1 - normalCdf(z)));
  return Math.max(Number.MIN_VALUE, 2 * Math.exp(-0.5 * z * z) / (Math.max(z, Number.EPSILON) * Math.sqrt(2 * Math.PI)));
}

function bhAdjust(pValues: number[]): number[] {
  const ordered = pValues.map((value, index) => ({ value, index })).sort((left, right) => left.value - right.value);
  const output = Array<number>(pValues.length);
  let previous = 1;
  for (let position = ordered.length - 1; position >= 0; position -= 1) {
    previous = Math.min(previous, ordered[position].value * ordered.length / (position + 1));
    output[ordered[position].index] = Math.min(1, previous);
  }
  return output;
}

function invert(matrix: number[][]): number[][] {
  const size = matrix.length;
  const augmented = matrix.map((row, rowIndex) => [...row, ...Array.from({ length: size }, (_, columnIndex) => rowIndex === columnIndex ? 1 : 0)]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    if (Math.abs(augmented[pivot][column]) < 1e-10) throw new Error("The selected design is singular. Remove a redundant covariate or merge sparse levels.");
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    augmented[column] = augmented[column].map((value) => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map((row) => row.slice(size));
}

function buildDesign(metadata: Array<Record<string, string>>, setup: UserAnalysisSetup): { matrix: number[][]; formula: string } {
  const covariateColumns: Array<{ name: string; values: number[][]; labels: string[] }> = [];
  setup.covariates.forEach((column) => {
    const raw = metadata.map((record) => record[column]);
    const numeric = raw.every((value) => value !== "" && Number.isFinite(Number(value)));
    if (numeric) {
      const values = raw.map(Number);
      const center = mean(values);
      const spread = Math.sqrt(variance(values));
      if (!spread) throw new Error(`Covariate “${column}” has no variation in the selected samples.`);
      covariateColumns.push({ name: column, values: values.map((value) => [(value - center) / spread]), labels: [column] });
      return;
    }
    const levels = [...new Set(raw)].sort((left, right) => left.localeCompare(right));
    if (levels.some((value) => value === "")) throw new Error(`Covariate “${column}” contains missing values.`);
    if (levels.length < 2) throw new Error(`Covariate “${column}” has no variation in the selected samples.`);
    covariateColumns.push({ name: column, values: raw.map((value) => levels.slice(1).map((level) => Number(value === level))), labels: levels.slice(1).map((level) => `${column}[${level}]`) });
  });
  const matrix = metadata.map((record, rowIndex) => [
    1,
    Number(record[setup.conditionColumn] === setup.comparisonLevel),
    ...covariateColumns.flatMap((column) => column.values[rowIndex]),
  ]);
  if (matrix[0].length >= matrix.length - 1) throw new Error("The selected design has too many parameters for the available samples.");
  return { matrix, formula: `log2_CPM ~ ${setup.conditionColumn}[${setup.comparisonLevel} vs ${setup.referenceLevel}]${setup.covariates.length ? ` + ${setup.covariates.join(" + ")}` : ""}` };
}

function logCpm(counts: number[][]): number[][] {
  return counts.map((row) => {
    const library = row.reduce((total, value) => total + value, 0);
    return row.map((value) => Math.log2(value / library * 1e6 + 0.5));
  });
}

function rankValues(values: number[]): { ranks: number[]; tieCorrection: number } {
  const ordered = values.map((value, index) => ({ value, index })).sort((left, right) => left.value - right.value);
  const ranks = Array<number>(values.length);
  let tieCorrection = 0;
  for (let start = 0; start < ordered.length;) {
    let end = start + 1;
    while (end < ordered.length && ordered[end].value === ordered[start].value) end += 1;
    const rank = (start + 1 + end) / 2;
    for (let position = start; position < end; position += 1) ranks[ordered[position].index] = rank;
    const size = end - start;
    tieCorrection += size ** 3 - size;
    start = end;
  }
  return { ranks, tieCorrection };
}

function makeResults(featureIds: string[], effects: number[], statistics: number[], pValues: number[]): UserFeatureResult[] {
  const adjusted = bhAdjust(pValues);
  return featureIds.map((featureId, index) => ({ featureId, effect: effects[index], statistic: statistics[index], pValue: pValues[index], adjustedPValue: adjusted[index] }))
    .sort((left, right) => left.adjustedPValue - right.adjustedPValue || Math.abs(right.effect) - Math.abs(left.effect));
}

function runAdjusted(featureIds: string[], expression: number[][], metadata: Array<Record<string, string>>, setup: UserAnalysisSetup): UserFeatureResult[] {
  const { matrix: design } = buildDesign(metadata, setup);
  const parameters = design[0].length;
  const crossProduct = Array.from({ length: parameters }, (_, left) => Array.from({ length: parameters }, (_, right) => design.reduce((total, row) => total + row[left] * row[right], 0)));
  const inverse = invert(crossProduct);
  const degreesFreedom = design.length - parameters;
  const effects: number[] = [];
  const statistics: number[] = [];
  const pValues: number[] = [];
  for (let feature = 0; feature < featureIds.length; feature += 1) {
    const response = expression.map((row) => row[feature]);
    const crossResponse = Array.from({ length: parameters }, (_, parameter) => design.reduce((total, row, rowIndex) => total + row[parameter] * response[rowIndex], 0));
    const coefficients = inverse.map((row) => row.reduce((total, value, index) => total + value * crossResponse[index], 0));
    const residualSum = design.reduce((total, row, rowIndex) => {
      const fitted = row.reduce((sum, value, index) => sum + value * coefficients[index], 0);
      return total + (response[rowIndex] - fitted) ** 2;
    }, 0);
    const standardError = Math.sqrt(residualSum / degreesFreedom * inverse[1][1]);
    const statistic = coefficients[1] / (standardError || Number.EPSILON);
    effects.push(coefficients[1]);
    statistics.push(statistic);
    pValues.push(twoSidedNormalP(statistic));
  }
  return makeResults(featureIds, effects, statistics, pValues);
}

function runWelch(featureIds: string[], expression: number[][], comparison: boolean[]): UserFeatureResult[] {
  const first = comparison.map((isComparison, index) => ({ isComparison, index })).filter((item) => item.isComparison).map((item) => item.index);
  const second = comparison.map((isComparison, index) => ({ isComparison, index })).filter((item) => !item.isComparison).map((item) => item.index);
  const effects: number[] = [];
  const statistics: number[] = [];
  const pValues: number[] = [];
  for (let feature = 0; feature < featureIds.length; feature += 1) {
    const comparisonValues = first.map((index) => expression[index][feature]);
    const referenceValues = second.map((index) => expression[index][feature]);
    const effect = mean(comparisonValues) - mean(referenceValues);
    const standardError = Math.sqrt(variance(comparisonValues) / comparisonValues.length + variance(referenceValues) / referenceValues.length);
    const statistic = effect / (standardError || Number.EPSILON);
    effects.push(effect);
    statistics.push(statistic);
    pValues.push(twoSidedNormalP(statistic));
  }
  return makeResults(featureIds, effects, statistics, pValues);
}

function runWilcoxon(featureIds: string[], expression: number[][], comparison: boolean[]): UserFeatureResult[] {
  const n1 = comparison.filter(Boolean).length;
  const n0 = comparison.length - n1;
  const effects: number[] = [];
  const statistics: number[] = [];
  const pValues: number[] = [];
  for (let feature = 0; feature < featureIds.length; feature += 1) {
    const values = expression.map((row) => row[feature]);
    const { ranks, tieCorrection } = rankValues(values);
    const rankSum = ranks.reduce((total, rank, index) => total + (comparison[index] ? rank : 0), 0);
    const u = rankSum - n1 * (n1 + 1) / 2;
    const expectation = n1 * n0 / 2;
    const correction = tieCorrection / (values.length * (values.length - 1));
    const standardDeviation = Math.sqrt(n1 * n0 * ((values.length + 1) - correction) / 12);
    const statistic = (u - expectation) / (standardDeviation || Number.EPSILON);
    const comparisonValues = values.filter((_, index) => comparison[index]);
    const referenceValues = values.filter((_, index) => !comparison[index]);
    effects.push(median(comparisonValues) - median(referenceValues));
    statistics.push(statistic);
    pValues.push(twoSidedNormalP(statistic));
  }
  return makeResults(featureIds, effects, statistics, pValues);
}

function summarize(methodId: UserAnalysisMethodId, results: UserFeatureResult[], software: string): UserMethodRun {
  const method = userAnalysisMethods.find((item) => item.id === methodId)!;
  const significant = results.filter((row) => row.adjustedPValue < 0.05);
  return {
    method,
    results,
    significantCount: significant.length,
    positiveCount: significant.filter((row) => row.effect > 0).length,
    negativeCount: significant.filter((row) => row.effect < 0).length,
    software,
  };
}

const csvEscape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

function countsCsv(dataset: UserDataset, indices: number[]): string {
  const header = ["feature_id", ...indices.map((index) => dataset.sampleIds[index])].map(csvEscape).join(",");
  return [header, ...dataset.featureIds.map((featureId, featureIndex) => [featureId, ...indices.map((sampleIndex) => dataset.counts[sampleIndex][featureIndex])].map(csvEscape).join(","))].join("\n");
}

function metadataCsv(dataset: UserDataset, indices: number[]): string {
  return [dataset.metadataColumns.map(csvEscape).join(","), ...indices.map((index) => dataset.metadataColumns.map((column) => csvEscape(dataset.metadata[index][column])).join(","))].join("\n");
}

function configCsv(dataset: UserDataset, setup: UserAnalysisSetup, rMethods: UserAnalysisMethodId[]): string {
  const rows = [
    ["sample_id_column", dataset.sampleIdColumn],
    ["condition_column", setup.conditionColumn],
    ["reference_level", setup.referenceLevel],
    ["comparison_level", setup.comparisonLevel],
    ...setup.covariates.map((value) => ["covariate", value]),
    ...rMethods.map((value) => ["method", value]),
  ];
  return ["key,value", ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
}

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function runInR(dataset: UserDataset, setup: UserAnalysisSetup, indices: number[], onProgress?: (message: string) => void): Promise<UserMethodRun[]> {
  const rMethods = setup.methods.filter((method) => method.startsWith("r_"));
  if (rMethods.length === 0) return [];
  const runtime = await getWebRRuntime(onProgress);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const countPath = `/tmp/biotrust-user-counts-${suffix}.csv`;
  const metadataPath = `/tmp/biotrust-user-metadata-${suffix}.csv`;
  const configPath = `/tmp/biotrust-user-config-${suffix}.csv`;
  await runtime.FS.writeFile(countPath, new TextEncoder().encode(countsCsv(dataset, indices)));
  await runtime.FS.writeFile(metadataPath, new TextEncoder().encode(metadataCsv(dataset, indices)));
  await runtime.FS.writeFile(configPath, new TextEncoder().encode(configCsv(dataset, setup, rMethods)));
  onProgress?.(`Running ${rMethods.length} selected method${rMethods.length === 1 ? "" : "s"} in R`);
  const table = await runtime.evalRString(`
    metadata <- utils::read.csv("${metadataPath}", check.names = FALSE, stringsAsFactors = FALSE, na.strings = "__BIOTRUST_MISSING__")
    count_frame <- utils::read.csv("${countPath}", check.names = FALSE)
    config <- utils::read.csv("${configPath}", stringsAsFactors = FALSE)
    config_value <- function(key) config$value[config$key == key]
    sample_id_column <- config_value("sample_id_column")[[1]]
    condition_column <- config_value("condition_column")[[1]]
    reference_level <- config_value("reference_level")[[1]]
    comparison_level <- config_value("comparison_level")[[1]]
    covariates <- config_value("covariate")
    selected_methods <- config_value("method")
    feature_ids <- count_frame[[1]]
    feature_by_sample <- as.matrix(count_frame[, -1, drop = FALSE])
    storage.mode(feature_by_sample) <- "double"
    counts <- t(feature_by_sample)
    colnames(counts) <- feature_ids
    rownames(counts) <- colnames(count_frame)[-1]
    metadata <- metadata[match(rownames(counts), metadata[[sample_id_column]]), , drop = FALSE]
    comparison <- metadata[[condition_column]] == comparison_level
    library_size <- rowSums(counts)
    log_cpm <- log2(sweep(counts, 1, library_size, "/") * 1e6 + 0.5)
    format_number <- function(x) format(x, digits = 17, scientific = TRUE, trim = TRUE)
    make_lines <- function(method_id, effect, statistic, p_value) {
      adjusted <- stats::p.adjust(p_value, method = "BH")
      paste(method_id, colnames(log_cpm), format_number(effect), format_number(statistic), format_number(p_value), format_number(adjusted), sep = "\\t")
    }
    output <- character()
    if ("r_adjusted_ols" %in% selected_methods) {
      model_data <- data.frame(group_comparison = as.numeric(comparison), metadata[, covariates, drop = FALSE], check.names = FALSE)
      names(model_data) <- c("group_comparison", if (length(covariates)) paste0("covariate_", seq_along(covariates)) else character())
      design <- stats::model.matrix(stats::reformulate(names(model_data)), data = model_data)
      inverse_information <- solve(crossprod(design))
      coefficients <- inverse_information %*% crossprod(design, log_cpm)
      residuals <- log_cpm - design %*% coefficients
      degrees_freedom <- nrow(design) - ncol(design)
      residual_variance <- colSums(residuals ^ 2) / degrees_freedom
      response_row <- match("group_comparison", rownames(coefficients))
      standard_error <- sqrt(inverse_information[response_row, response_row] * residual_variance)
      statistic <- coefficients[response_row, ] / standard_error
      p_value <- 2 * stats::pt(-abs(statistic), df = degrees_freedom)
      output <- c(output, make_lines("r_adjusted_ols", coefficients[response_row, ], statistic, p_value))
    }
    if ("r_welch" %in% selected_methods) {
      first <- log_cpm[comparison, , drop = FALSE]
      second <- log_cpm[!comparison, , drop = FALSE]
      effect <- colMeans(first) - colMeans(second)
      first_variance <- apply(first, 2, stats::var)
      second_variance <- apply(second, 2, stats::var)
      first_term <- first_variance / nrow(first)
      second_term <- second_variance / nrow(second)
      statistic <- effect / sqrt(first_term + second_term)
      degrees_freedom <- (first_term + second_term) ^ 2 / ((first_term ^ 2 / (nrow(first) - 1)) + (second_term ^ 2 / (nrow(second) - 1)))
      p_value <- 2 * stats::pt(-abs(statistic), df = degrees_freedom)
      output <- c(output, make_lines("r_welch", effect, statistic, p_value))
    }
    if ("r_wilcoxon" %in% selected_methods) {
      wilcoxon <- apply(log_cpm, 2, function(values) {
        fit <- suppressWarnings(stats::wilcox.test(values[comparison], values[!comparison], exact = FALSE))
        c(effect = stats::median(values[comparison]) - stats::median(values[!comparison]), statistic = unname(fit$statistic), p_value = fit$p.value)
      })
      output <- c(output, make_lines("r_wilcoxon", wilcoxon["effect", ], wilcoxon["statistic", ], wilcoxon["p_value", ]))
    }
    paste(c("method_id\\tfeature_id\\teffect\\tstatistic\\tp_value\\tadjusted_p_value", output), collapse = "\\n")
  `);
  const rVersion = await runtime.evalRString("R.version.string");
  const packageVersion = await runtime.evalRString('as.character(utils::packageVersion("stats"))');
  const lines = table.trim().split("\n");
  if (!lines[0]?.startsWith("method_id\tfeature_id")) throw new Error("R returned an unreadable result table.");
  const grouped = new Map<UserAnalysisMethodId, UserFeatureResult[]>();
  lines.slice(1).forEach((line) => {
    const [methodId, featureId, effect, statistic, pValue, adjustedPValue] = line.split("\t");
    const id = methodId as UserAnalysisMethodId;
    if (!rMethods.includes(id)) return;
    grouped.set(id, [...(grouped.get(id) ?? []), { featureId, effect: Number(effect), statistic: Number(statistic), pValue: Number(pValue), adjustedPValue: Number(adjustedPValue) }]);
  });
  return rMethods.map((methodId) => {
    const results = (grouped.get(methodId) ?? []).sort((left, right) => left.adjustedPValue - right.adjustedPValue || Math.abs(right.effect) - Math.abs(left.effect));
    if (results.length !== dataset.featureIds.length) throw new Error(`${methodId} returned ${results.length} of ${dataset.featureIds.length} features.`);
    return summarize(methodId, results, `${rVersion} · stats ${packageVersion}`);
  });
}

function compareRuns(runs: UserMethodRun[]): UserMethodComparison[] {
  const comparisons: UserMethodComparison[] = [];
  for (let left = 0; left < runs.length; left += 1) for (let right = left + 1; right < runs.length; right += 1) {
    const rightByFeature = new Map(runs[right].results.map((row) => [row.featureId, row]));
    const aligned = runs[left].results.map((row) => [row, rightByFeature.get(row.featureId)!] as const);
    const signAgreement = aligned.filter(([a, b]) => Math.sign(a.effect) === Math.sign(b.effect)).length / aligned.length;
    const size = Math.min(50, aligned.length);
    const leftTop = new Set(runs[left].results.slice(0, size).map((row) => row.featureId));
    const rightTop = new Set(runs[right].results.slice(0, size).map((row) => row.featureId));
    const leftFdr = new Set(runs[left].results.filter((row) => row.adjustedPValue < 0.05).map((row) => row.featureId));
    const rightFdr = new Set(runs[right].results.filter((row) => row.adjustedPValue < 0.05).map((row) => row.featureId));
    comparisons.push({
      methodA: runs[left].method.id,
      methodB: runs[right].method.id,
      signAgreement,
      topFeatureOverlap: [...leftTop].filter((feature) => rightTop.has(feature)).length,
      fdrOverlap: [...leftFdr].filter((feature) => rightFdr.has(feature)).length,
    });
  }
  return comparisons;
}

export async function runUserAnalysis(dataset: UserDataset, setup: UserAnalysisSetup, onProgress?: (message: string) => void): Promise<UserAnalysisOutput> {
  const issues = validateUserSetup(dataset, setup);
  if (issues.length) throw new Error(issues[0]);
  const indices = dataset.metadata.map((record, index) => ({ record, index })).filter(({ record }) => [setup.referenceLevel, setup.comparisonLevel].includes(record[setup.conditionColumn])).map(({ index }) => index);
  const metadata = indices.map((index) => dataset.metadata[index]);
  const counts = indices.map((index) => dataset.counts[index]);
  const expression = logCpm(counts);
  const comparison = metadata.map((record) => record[setup.conditionColumn] === setup.comparisonLevel);
  const runs: UserMethodRun[] = [];
  onProgress?.("Running selected browser methods");
  setup.methods.filter((method) => method.startsWith("js_")).forEach((methodId) => {
    if (methodId === "js_adjusted_ols") runs.push(summarize(methodId, runAdjusted(dataset.featureIds, expression, metadata, setup), "BioTrust browser statistics v1"));
    if (methodId === "js_welch") runs.push(summarize(methodId, runWelch(dataset.featureIds, expression, comparison), "BioTrust browser statistics v1"));
    if (methodId === "js_wilcoxon") runs.push(summarize(methodId, runWilcoxon(dataset.featureIds, expression, comparison), "BioTrust browser statistics v1"));
  });
  runs.push(...await runInR(dataset, setup, indices, onProgress));
  const adjusted = runs.find((run) => run.method.adjustsCovariates);
  const recommended = setup.covariates.length ? adjusted ?? runs[0] : runs.find((run) => run.method.id === "r_welch" || run.method.id === "js_welch") ?? adjusted ?? runs[0];
  const groupCounts = { [setup.referenceLevel]: comparison.filter((value) => !value).length, [setup.comparisonLevel]: comparison.filter(Boolean).length };
  const allIndices = dataset.sampleIds.map((_, index) => index);
  const [countsSha256, metadataSha256, outputHash] = await Promise.all([
    sha256(countsCsv(dataset, allIndices)),
    sha256(metadataCsv(dataset, allIndices)),
    sha256(runs.flatMap((run) => run.results.map((row) => [run.method.id, row.featureId, row.effect, row.statistic, row.pValue, row.adjustedPValue].join("\t"))).join("\n")),
  ]);
  return {
    executionId: `LOCAL-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`,
    generatedAt: new Date().toISOString(),
    inputHashes: { countsSha256, metadataSha256 },
    outputHash,
    setup,
    sampleCount: indices.length,
    featureCount: dataset.featureIds.length,
    groupCounts,
    runs,
    comparisons: compareRuns(runs),
    recommendation: {
      methodId: recommended.method.id,
      title: setup.covariates.length ? `Use ${recommended.method.shortName} as the primary browser result` : `Use ${recommended.method.shortName} for the declared two-group question`,
      reasons: setup.covariates.length
        ? ["It is selected and adjusts the covariates declared in the question.", "Unadjusted methods should remain sensitivity screens.", "Compare effect direction and top-feature overlap before accepting a conclusion."]
        : ["No covariates were declared for this two-group comparison.", "A second method can expose sensitivity to distributional assumptions.", "Statistical agreement does not replace replication."],
      caution: "These online transformed-count analyses support exploration and method comparison. Use a validated count-native workflow, diagnostics, and independent review before publication.",
    },
    warnings: [
      "Uploaded files were parsed and analyzed locally in this browser and were not sent to BioTrust or an external AI service.",
      "Browser and R stats methods operate on log-CPM values; they are not substitutes for edgeR or DESeq2 count models.",
      "Associations do not establish causality, mechanism, diagnosis, treatment benefit, or clinical utility.",
    ],
  };
}

export function userResultsCsv(output: UserAnalysisOutput): string {
  const lines = ["method_id,method_name,engine,feature_id,effect,statistic,p_value,adjusted_p_value"];
  output.runs.forEach((run) => run.results.forEach((row) => lines.push([
    run.method.id,
    csvEscape(run.method.name),
    csvEscape(run.method.engine),
    csvEscape(row.featureId),
    row.effect,
    row.statistic,
    row.pValue,
    row.adjustedPValue,
  ].join(","))));
  return lines.join("\n");
}

export function toReportResult(dataset: UserDataset, output: UserAnalysisOutput) {
  const primary = output.runs.find((run) => run.method.id === output.recommendation.methodId) ?? output.runs[0];
  return {
    execution_id: output.executionId,
    status: "complete",
    method: primary.method.name,
    comparison: output.setup.comparisonLevel,
    reference: output.setup.referenceLevel,
    design: buildDesign(dataset.metadata.filter((record) => [output.setup.referenceLevel, output.setup.comparisonLevel].includes(record[output.setup.conditionColumn])), output.setup).formula,
    sample_count: output.sampleCount,
    feature_count: output.featureCount,
    retained_feature_count: output.featureCount,
    input_hashes: { counts_sha256: output.inputHashes.countsSha256, metadata_sha256: output.inputHashes.metadataSha256 },
    output_hash: output.outputHash,
    software_versions: Object.fromEntries(output.runs.map((run) => [run.method.shortName, run.software])),
    warnings: output.warnings,
    generated_at: output.generatedAt,
    results: primary.results.map((row) => ({ feature_id: row.featureId, log2_fold_change: row.effect, statistic: row.statistic, p_value: row.pValue, adjusted_p_value: row.adjustedPValue })),
  };
}
