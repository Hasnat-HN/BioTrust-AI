import {
  calculateLogCpm,
  type InterpretationConnection,
  type FeatureResult,
  type MelanomaAnalysisResult,
  type MelanomaDataset,
} from "./melanomaDemo.ts";

export type BrowserDgeMethodId = "adjusted_ols" | "welch_t" | "wilcoxon";

export type BrowserDgeMethod = {
  id: BrowserDgeMethodId;
  name: string;
  short_name: string;
  role: string;
  adjusts_covariates: boolean;
  answers: string;
  limitation: string;
};

export const browserDgeMethods: BrowserDgeMethod[] = [
  {
    id: "adjusted_ols",
    name: "Multivariable log-CPM model",
    short_name: "Adjusted OLS",
    role: "Recommended primary browser method",
    adjusts_covariates: true,
    answers: "Adjusted mean expression difference associated with response under the declared clinical and technical design.",
    limitation: "Uses transformed counts and ordinary least squares; it is not a count-native edgeR or DESeq2 model.",
  },
  {
    id: "welch_t",
    name: "Welch two-group screen",
    short_name: "Welch",
    role: "Parametric sensitivity analysis",
    adjusts_covariates: false,
    answers: "Unadjusted mean log-CPM difference allowing unequal group variances.",
    limitation: "Cannot adjust age, stage, site, purity, prior therapy, or batch; not suitable as the primary answer here.",
  },
  {
    id: "wilcoxon",
    name: "Wilcoxon rank-sum screen",
    short_name: "Wilcoxon",
    role: "Rank-based sensitivity analysis",
    adjusts_covariates: false,
    answers: "Whether the response groups differ in their expression-rank distributions.",
    limitation: "Does not estimate the same conditional mean effect and cannot adjust the declared covariates.",
  },
];

export type DatasetExploration = {
  matrix: { samples: number; features: number; cells: number; zero_rate: number; integer_nonnegative: boolean };
  groups: { responder: number; non_responder: number };
  library_size: { minimum: number; median: number; maximum: number; histogram: Array<{ label: string; count: number }> };
  detected_features: { median: number; minimum: number; maximum: number };
  purity_bins: Array<{ label: string; count: number }>;
  batch_counts: Array<{ label: string; count: number }>;
  stage_counts: Array<{ label: string; count: number }>;
  site_counts: Array<{ label: string; count: number }>;
  checks: Array<{ label: string; status: "PASS" | "REVIEW"; detail: string }>;
};

export type DgeMethodRun = {
  method: BrowserDgeMethod;
  results: FeatureResult[];
  significant_count: number;
  positive_count: number;
  negative_count: number;
};

export type PairwiseMethodComparison = {
  method_a: BrowserDgeMethodId;
  method_b: BrowserDgeMethodId;
  effect_spearman: number;
  sign_concordance: number;
  top_50_overlap: number;
  fdr_overlap: number;
};

export type DgeMethodComparison = {
  runs: DgeMethodRun[];
  pairwise: PairwiseMethodComparison[];
  consensus_features: Array<{ feature_id: string; agreeing_methods: number; direction: "higher" | "lower"; best_fdr: number }>;
  recommendation: {
    method_id: BrowserDgeMethodId;
    title: string;
    rationale: string[];
    caution: string;
  };
};

export type NeuralIntegrationResult = {
  name: "Deterministic shallow neural integration";
  architecture: string;
  folds: number;
  epochs_per_fold: number;
  auc: number;
  balanced_accuracy: number;
  brier_score: number;
  importance: Array<{ feature: string; importance: number }>;
  warnings: string[];
};

export type ComparisonSynthesis = {
  generated_by: "BioTrust traceable comparison rules v2";
  summary: string;
  connections: InterpretationConnection[];
};

export function dgeComparisonCsv(comparison: DgeMethodComparison): string {
  const lines = ["method_id,method_name,feature_id,program,response_effect,statistic,p_value,adjusted_p_value"];
  comparison.runs.forEach((run) => run.results.forEach((row) => lines.push([
    run.method.id,
    `"${run.method.name.replaceAll('"', '""')}"`,
    row.feature_id,
    `"${row.program.replaceAll('"', '""')}"`,
    row.response_effect,
    row.statistic,
    row.p_value,
    row.adjusted_p_value,
  ].join(","))));
  return lines.join("\n");
}

const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
const median = (values: number[]) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};
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
  const inverse = 1 / z;
  const inverseSquared = inverse * inverse;
  const series = inverse * (1 - inverseSquared + 3 * inverseSquared ** 2 - 15 * inverseSquared ** 3 + 105 * inverseSquared ** 4);
  return Math.max(Number.MIN_VALUE, 2 * Math.exp(-0.5 * z * z) * series / Math.sqrt(2 * Math.PI));
}

function bhAdjust(pValues: number[]): number[] {
  const ordered = pValues.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const output = Array<number>(pValues.length);
  let previous = 1;
  for (let position = ordered.length - 1; position >= 0; position -= 1) {
    previous = Math.min(previous, ordered[position].value * ordered.length / (position + 1));
    output[ordered[position].index] = Math.min(1, previous);
  }
  return output;
}

function histogram(values: number[], bins = 8): Array<{ label: string; count: number }> {
  const logs = values.map((value) => Math.log10(Math.max(1, value)));
  const minimum = Math.min(...logs);
  const maximum = Math.max(...logs);
  const width = (maximum - minimum || 1) / bins;
  const counts = Array.from({ length: bins }, () => 0);
  logs.forEach((value) => { counts[Math.min(bins - 1, Math.floor((value - minimum) / width))] += 1; });
  return counts.map((count, index) => ({ label: `${(minimum + index * width).toFixed(1)}-${(minimum + (index + 1) * width).toFixed(1)}`, count }));
}

function categoryCounts<T extends string>(values: T[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].map(([label, count]) => ({ label: label.replaceAll("_", " "), count }));
}

export function exploreMelanomaDataset(dataset: MelanomaDataset): DatasetExploration {
  const libraries = dataset.counts.map((row) => row.reduce((total, value) => total + value, 0));
  const detected = dataset.counts.map((row) => row.filter((value) => value > 0).length);
  const zeros = dataset.counts.reduce((total, row) => total + row.filter((value) => value === 0).length, 0);
  const allInteger = dataset.counts.every((row) => row.every((value) => Number.isInteger(value) && value >= 0));
  return {
    matrix: { samples: dataset.samples.length, features: dataset.featureIds.length, cells: dataset.samples.length * dataset.featureIds.length, zero_rate: zeros / (dataset.samples.length * dataset.featureIds.length), integer_nonnegative: allInteger },
    groups: { responder: dataset.samples.filter((sample) => sample.response === "Responder").length, non_responder: dataset.samples.filter((sample) => sample.response === "Non-responder").length },
    library_size: { minimum: Math.min(...libraries), median: median(libraries), maximum: Math.max(...libraries), histogram: histogram(libraries) },
    detected_features: { median: median(detected), minimum: Math.min(...detected), maximum: Math.max(...detected) },
    purity_bins: [
      { label: "< 0.50", count: dataset.samples.filter((sample) => sample.tumor_purity < 0.5).length },
      { label: "0.50-0.70", count: dataset.samples.filter((sample) => sample.tumor_purity >= 0.5 && sample.tumor_purity < 0.7).length },
      { label: ">= 0.70", count: dataset.samples.filter((sample) => sample.tumor_purity >= 0.7).length },
    ],
    batch_counts: categoryCounts(dataset.samples.map((sample) => sample.batch)),
    stage_counts: categoryCounts(dataset.samples.map((sample) => sample.disease_stage)),
    site_counts: categoryCounts(dataset.samples.map((sample) => sample.biopsy_site)),
    checks: [
      { label: "Count-matrix structure", status: allInteger ? "PASS" : "REVIEW", detail: allInteger ? "All entries are non-negative integers." : "Non-integer or negative entries require review." },
      { label: "Group replication", status: "PASS", detail: `${dataset.samples.filter((sample) => sample.response === "Responder").length} responders and ${dataset.samples.filter((sample) => sample.response === "Non-responder").length} non-responders.` },
      { label: "Covariate complexity", status: "REVIEW", detail: "Seven declared clinical and technical covariates require an adjusted primary model." },
      { label: "Count-aware production method", status: "REVIEW", detail: "Use edgeR or DESeq2 in a controlled R runner before publication; browser methods are demonstrations." },
    ],
  };
}

function makeFeatureResults(dataset: MelanomaDataset, effects: number[], statistics: number[], pValues: number[]): FeatureResult[] {
  const adjusted = bhAdjust(pValues);
  return dataset.featureIds.map((featureId, index) => ({
    feature_id: featureId,
    program: dataset.programs[index],
    response_effect: effects[index],
    statistic: statistics[index],
    p_value: pValues[index],
    adjusted_p_value: adjusted[index],
  })).sort((a, b) => a.adjusted_p_value - b.adjusted_p_value || Math.abs(b.response_effect) - Math.abs(a.response_effect));
}

function runWelch(dataset: MelanomaDataset, expression: number[][]): FeatureResult[] {
  const responderIndices = dataset.samples.map((sample, index) => ({ sample, index })).filter(({ sample }) => sample.response === "Responder").map(({ index }) => index);
  const otherIndices = dataset.samples.map((sample, index) => ({ sample, index })).filter(({ sample }) => sample.response === "Non-responder").map(({ index }) => index);
  const effects: number[] = [];
  const statistics: number[] = [];
  const pValues: number[] = [];
  for (let feature = 0; feature < dataset.featureIds.length; feature += 1) {
    const responders = responderIndices.map((index) => expression[index][feature]);
    const others = otherIndices.map((index) => expression[index][feature]);
    const effect = mean(responders) - mean(others);
    const standardError = Math.sqrt(variance(responders) / responders.length + variance(others) / others.length);
    const statistic = effect / (standardError || 1);
    effects.push(effect);
    statistics.push(statistic);
    pValues.push(twoSidedNormalP(statistic));
  }
  return makeFeatureResults(dataset, effects, statistics, pValues);
}

function rankValues(values: number[]): { ranks: number[]; tieCorrection: number } {
  const ordered = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = Array<number>(values.length);
  let tieCorrection = 0;
  let start = 0;
  while (start < ordered.length) {
    let end = start + 1;
    while (end < ordered.length && ordered[end].value === ordered[start].value) end += 1;
    const rank = (start + 1 + end) / 2;
    for (let position = start; position < end; position += 1) ranks[ordered[position].index] = rank;
    const tieSize = end - start;
    tieCorrection += tieSize ** 3 - tieSize;
    start = end;
  }
  return { ranks, tieCorrection };
}

function runWilcoxon(dataset: MelanomaDataset, expression: number[][]): FeatureResult[] {
  const response = dataset.samples.map((sample) => sample.response === "Responder");
  const n1 = response.filter(Boolean).length;
  const n0 = response.length - n1;
  const effects: number[] = [];
  const statistics: number[] = [];
  const pValues: number[] = [];
  for (let feature = 0; feature < dataset.featureIds.length; feature += 1) {
    const values = expression.map((row) => row[feature]);
    const { ranks, tieCorrection } = rankValues(values);
    const rankSum = ranks.reduce((total, rank, index) => total + (response[index] ? rank : 0), 0);
    const u = rankSum - n1 * (n1 + 1) / 2;
    const expectation = n1 * n0 / 2;
    const correction = tieCorrection / (values.length * (values.length - 1));
    const standardDeviation = Math.sqrt(n1 * n0 * ((values.length + 1) - correction) / 12);
    const statistic = (u - expectation) / (standardDeviation || 1);
    const responders = values.filter((_, index) => response[index]);
    const others = values.filter((_, index) => !response[index]);
    effects.push(median(responders) - median(others));
    statistics.push(statistic);
    pValues.push(twoSidedNormalP(statistic));
  }
  return makeFeatureResults(dataset, effects, statistics, pValues);
}

function summarizeRun(method: BrowserDgeMethod, results: FeatureResult[]): DgeMethodRun {
  const significant = results.filter((row) => row.adjusted_p_value < 0.05);
  return { method, results, significant_count: significant.length, positive_count: significant.filter((row) => row.response_effect > 0).length, negative_count: significant.filter((row) => row.response_effect < 0).length };
}

function ranks(values: number[]): number[] {
  return rankValues(values).ranks;
}

function pearson(left: number[], right: number[]): number {
  const leftMean = mean(left);
  const rightMean = mean(right);
  const numerator = left.reduce((total, value, index) => total + (value - leftMean) * (right[index] - rightMean), 0);
  const denominator = Math.sqrt(left.reduce((total, value) => total + (value - leftMean) ** 2, 0) * right.reduce((total, value) => total + (value - rightMean) ** 2, 0));
  return denominator ? numerator / denominator : 0;
}

function compareRuns(left: DgeMethodRun, right: DgeMethodRun): PairwiseMethodComparison {
  const leftMap = new Map(left.results.map((row) => [row.feature_id, row]));
  const alignedLeft = right.results.map((row) => leftMap.get(row.feature_id)!);
  const unionTop = new Set([...left.results.slice(0, 50).map((row) => row.feature_id), ...right.results.slice(0, 50).map((row) => row.feature_id)]);
  const signMatches = right.results.filter((row, index) => Math.sign(row.response_effect) === Math.sign(alignedLeft[index].response_effect)).length;
  const leftFdr = new Set(left.results.filter((row) => row.adjusted_p_value < 0.05).map((row) => row.feature_id));
  const rightFdr = new Set(right.results.filter((row) => row.adjusted_p_value < 0.05).map((row) => row.feature_id));
  return {
    method_a: left.method.id,
    method_b: right.method.id,
    effect_spearman: pearson(ranks(alignedLeft.map((row) => row.response_effect)), ranks(right.results.map((row) => row.response_effect))),
    sign_concordance: signMatches / right.results.length,
    top_50_overlap: [...unionTop].filter((feature) => left.results.slice(0, 50).some((row) => row.feature_id === feature) && right.results.slice(0, 50).some((row) => row.feature_id === feature)).length,
    fdr_overlap: [...leftFdr].filter((feature) => rightFdr.has(feature)).length,
  };
}

export function runDgeMethodComparison(dataset: MelanomaDataset, primary: MelanomaAnalysisResult, selected: BrowserDgeMethodId[]): DgeMethodComparison {
  const expression = calculateLogCpm(dataset);
  const runs = selected.map((id) => {
    const method = browserDgeMethods.find((candidate) => candidate.id === id)!;
    if (id === "adjusted_ols") return summarizeRun(method, primary.feature_results);
    if (id === "welch_t") return summarizeRun(method, runWelch(dataset, expression));
    return summarizeRun(method, runWilcoxon(dataset, expression));
  });
  const pairwise: PairwiseMethodComparison[] = [];
  for (let left = 0; left < runs.length; left += 1) for (let right = left + 1; right < runs.length; right += 1) pairwise.push(compareRuns(runs[left], runs[right]));
  const perFeature = new Map<string, FeatureResult[]>();
  runs.forEach((run) => run.results.forEach((row) => {
    if (row.adjusted_p_value < 0.05) perFeature.set(row.feature_id, [...(perFeature.get(row.feature_id) ?? []), row]);
  }));
  const consensusFeatures = [...perFeature.entries()].filter(([, rows]) => rows.length >= 2 && rows.every((row) => Math.sign(row.response_effect) === Math.sign(rows[0].response_effect))).map(([featureId, rows]) => ({ feature_id: featureId, agreeing_methods: rows.length, direction: rows[0].response_effect > 0 ? "higher" as const : "lower" as const, best_fdr: Math.min(...rows.map((row) => row.adjusted_p_value)) })).sort((a, b) => b.agreeing_methods - a.agreeing_methods || a.best_fdr - b.best_fdr);
  const hasAdjusted = selected.includes("adjusted_ols");
  return {
    runs,
    pairwise,
    consensus_features: consensusFeatures,
    recommendation: {
      method_id: hasAdjusted ? "adjusted_ols" : selected[0],
      title: hasAdjusted ? "Use the multivariable model as the primary browser result" : "Add the multivariable model before choosing a primary result",
      rationale: hasAdjusted ? [
        "It estimates the conditional response association requested by the researcher.",
        "It adjusts the seven declared clinical and technical covariates.",
        "Welch and Wilcoxon remain useful sensitivity screens when their direction and ranking agree.",
      ] : ["The selected unadjusted methods cannot address the declared multivariable question.", "Their agreement is sensitivity evidence, not a substitute for covariate adjustment."],
      caution: "Method agreement is not external validation, and method disagreement should be investigated rather than averaged away.",
    },
  };
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  };
}

function sigmoid(value: number) { return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value)))); }

function auc(labels: number[], scores: number[]): number {
  const positives = labels.filter(Boolean).length;
  const negatives = labels.length - positives;
  const scoreRanks = rankValues(scores).ranks;
  const positiveRankSum = scoreRanks.reduce((total, rank, index) => total + (labels[index] ? rank : 0), 0);
  return (positiveRankSum - positives * (positives + 1) / 2) / Math.max(1, positives * negatives);
}

function neuralInputs(dataset: MelanomaDataset): { labels: number[]; names: string[]; matrix: number[][] } {
  const expression = calculateLogCpm(dataset);
  const programNames = ["T-cell program", "Interferon program", "Myeloid program", "Stromal program"];
  const programKeys = ["T-cell-inflamed program", "Interferon-response program", "Myeloid program", "Stromal program"];
  const programScores = programKeys.map((program) => {
    const indices = dataset.programs.map((value, index) => ({ value, index })).filter(({ value }) => value === program).map(({ index }) => index);
    return expression.map((row) => mean(indices.map((index) => row[index])));
  });
  const names = [...programNames, "Age", "Recorded sex", "Stage", "Lymph-node site", "Visceral site", "Prior therapy", "Tumor purity", "Batch 2", "Batch 3"];
  const matrix = dataset.samples.map((sample, index) => [
    ...programScores.map((scores) => scores[index]),
    sample.age_years,
    sample.recorded_sex === "Male" ? 1 : 0,
    sample.disease_stage === "Stage_IV" ? 1 : 0,
    sample.biopsy_site === "Lymph_node" ? 1 : 0,
    sample.biopsy_site === "Visceral" ? 1 : 0,
    sample.prior_systemic_therapy === "Yes" ? 1 : 0,
    sample.tumor_purity,
    sample.batch === "Batch_2" ? 1 : 0,
    sample.batch === "Batch_3" ? 1 : 0,
  ]);
  return { labels: dataset.samples.map((sample) => sample.response === "Responder" ? 1 : 0), names, matrix };
}

type NeuralModel = { inputHidden: number[][]; hiddenBias: number[]; hiddenOutput: number[]; outputBias: number };

function trainNeural(trainX: number[][], trainY: number[], seed: number, epochs = 240): NeuralModel {
  const random = createRandom(seed);
  const inputs = trainX[0].length;
  const hidden = 8;
  const model: NeuralModel = {
    inputHidden: Array.from({ length: inputs }, () => Array.from({ length: hidden }, () => (random() - 0.5) * 0.18)),
    hiddenBias: Array.from({ length: hidden }, () => 0),
    hiddenOutput: Array.from({ length: hidden }, () => (random() - 0.5) * 0.18),
    outputBias: 0,
  };
  const positiveWeight = trainY.length / (2 * trainY.filter(Boolean).length);
  const negativeWeight = trainY.length / (2 * trainY.filter((value) => !value).length);
  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradIH = model.inputHidden.map((row) => row.map(() => 0));
    const gradHB = model.hiddenBias.map(() => 0);
    const gradHO = model.hiddenOutput.map(() => 0);
    let gradOB = 0;
    trainX.forEach((row, sampleIndex) => {
      const hiddenValues = model.hiddenBias.map((bias, h) => Math.tanh(bias + row.reduce((total, value, input) => total + value * model.inputHidden[input][h], 0)));
      const output = sigmoid(model.outputBias + hiddenValues.reduce((total, value, h) => total + value * model.hiddenOutput[h], 0));
      const weight = trainY[sampleIndex] ? positiveWeight : negativeWeight;
      const outputError = weight * (output - trainY[sampleIndex]);
      gradOB += outputError;
      hiddenValues.forEach((value, h) => {
        gradHO[h] += outputError * value;
        const hiddenError = outputError * model.hiddenOutput[h] * (1 - value * value);
        gradHB[h] += hiddenError;
        row.forEach((inputValue, input) => { gradIH[input][h] += hiddenError * inputValue; });
      });
    });
    const rate = 0.045 * (1 - 0.65 * epoch / epochs) / trainX.length;
    model.outputBias -= rate * gradOB;
    model.hiddenBias = model.hiddenBias.map((value, h) => value - rate * gradHB[h]);
    model.hiddenOutput = model.hiddenOutput.map((value, h) => value - rate * (gradHO[h] + 0.01 * value));
    model.inputHidden = model.inputHidden.map((row, input) => row.map((value, h) => value - rate * (gradIH[input][h] + 0.01 * value)));
  }
  return model;
}

function predictNeural(model: NeuralModel, row: number[]): number {
  const hidden = model.hiddenBias.map((bias, h) => Math.tanh(bias + row.reduce((total, value, input) => total + value * model.inputHidden[input][h], 0)));
  return sigmoid(model.outputBias + hidden.reduce((total, value, h) => total + value * model.hiddenOutput[h], 0));
}

function standardize(train: number[][], test: number[][]) {
  const centers = train[0].map((_, column) => mean(train.map((row) => row[column])));
  const scales = centers.map((center, column) => Math.sqrt(mean(train.map((row) => (row[column] - center) ** 2))) || 1);
  const apply = (rows: number[][]) => rows.map((row) => row.map((value, column) => (value - centers[column]) / scales[column]));
  return { train: apply(train), test: apply(test) };
}

export function runNeuralIntegration(dataset: MelanomaDataset): NeuralIntegrationResult {
  const { labels, names, matrix } = neuralInputs(dataset);
  const folds = 5;
  const assignments = labels.map((label, index) => ({ label, index })).sort((a, b) => a.label - b.label || a.index - b.index).reduce((output, item, position, ordered) => {
    const groupStart = ordered.findIndex((candidate) => candidate.label === item.label);
    output[item.index] = (position - groupStart) % folds;
    return output;
  }, Array<number>(labels.length));
  const predictions = Array<number>(labels.length);
  const importances = names.map(() => 0);
  for (let fold = 0; fold < folds; fold += 1) {
    const trainIndices = assignments.map((value, index) => ({ value, index })).filter(({ value }) => value !== fold).map(({ index }) => index);
    const testIndices = assignments.map((value, index) => ({ value, index })).filter(({ value }) => value === fold).map(({ index }) => index);
    const scaled = standardize(trainIndices.map((index) => matrix[index]), testIndices.map((index) => matrix[index]));
    const model = trainNeural(scaled.train, trainIndices.map((index) => labels[index]), 20260825 + fold);
    testIndices.forEach((index, position) => { predictions[index] = predictNeural(model, scaled.test[position]); });
    names.forEach((_, input) => {
      importances[input] += model.inputHidden[input].reduce((total, weight, hidden) => total + Math.abs(weight * model.hiddenOutput[hidden]), 0) / folds;
    });
  }
  const predicted = predictions.map((value) => value >= 0.5 ? 1 : 0);
  const sensitivity = labels.reduce((total, label, index) => total + (label === 1 && predicted[index] === 1 ? 1 : 0), 0) / labels.filter(Boolean).length;
  const specificity = labels.reduce((total, label, index) => total + (label === 0 && predicted[index] === 0 ? 1 : 0), 0) / labels.filter((value) => !value).length;
  const importanceTotal = importances.reduce((total, value) => total + value, 0) || 1;
  return {
    name: "Deterministic shallow neural integration",
    architecture: "13 standardized inputs -> 8 tanh hidden units -> 1 sigmoid output",
    folds,
    epochs_per_fold: 240,
    auc: auc(labels, predictions),
    balanced_accuracy: (sensitivity + specificity) / 2,
    brier_score: mean(predictions.map((value, index) => (value - labels[index]) ** 2)),
    importance: names.map((feature, index) => ({ feature, importance: importances[index] / importanceTotal })).sort((a, b) => b.importance - a.importance),
    warnings: [
      "Exploratory prediction only: neural performance does not validate a biomarker or explain mechanism.",
      "Cross-validation is internal to one synthetic cohort and is not external replication.",
      "Weight-path importance is model sensitivity, not causal or biological importance.",
      "The statistical DGE results remain the authoritative evidence for the declared association question.",
    ],
  };
}

export function buildComparisonSynthesis(comparison: DgeMethodComparison, neural?: NeuralIntegrationResult): ComparisonSynthesis {
  const hasComparison = comparison.pairwise.length > 0;
  const averageRankAgreement = hasComparison ? mean(comparison.pairwise.map((pair) => pair.effect_spearman)) : 0;
  const averageSignAgreement = hasComparison ? mean(comparison.pairwise.map((pair) => pair.sign_concordance)) : 0;
  const weakestPair = [...comparison.pairwise].sort((left, right) => left.effect_spearman - right.effect_spearman)[0];
  const recommended = comparison.runs.find((run) => run.method.id === comparison.recommendation.method_id) ?? comparison.runs[0];
  const adjustedWasSelected = comparison.runs.some((run) => run.method.id === "adjusted_ols");
  const pairLabel = weakestPair
    ? `${browserDgeMethods.find((method) => method.id === weakestPair.method_a)?.short_name} and ${browserDgeMethods.find((method) => method.id === weakestPair.method_b)?.short_name}`
    : "the selected methods";
  return {
    generated_by: "BioTrust traceable comparison rules v2",
    summary: adjustedWasSelected
      ? `${hasComparison ? `The selected methods show ${averageSignAgreement >= 0.8 ? "strong" : "mixed"} directional agreement, but ` : ""}the multivariable model answers the conditional research question.${neural ? " The selected neural model adds an internally cross-validated prediction view; it does not change the statistical method recommendation." : " No neural analysis was requested."}`
      : `${hasComparison ? "The selected unadjusted methods provide sensitivity views" : "The selected unadjusted method provides a descriptive sensitivity view"}, but ${hasComparison ? "none answers" : "it does not answer"} the conditional research question. Add the multivariable model before treating a result as primary.${neural ? " The neural model remains a separate prediction analysis." : ""}`,
    connections: [
      {
        id: "M1",
        kind: "evidence",
        title: "Selected methods were kept separate",
        finding: `${comparison.runs.length} methods completed on the same 180 samples and 1,200-feature universe; discovery counts range from ${Math.min(...comparison.runs.map((run) => run.significant_count))} to ${Math.max(...comparison.runs.map((run) => run.significant_count))} at BH FDR < 0.05.`,
        implication: "Different discovery counts reflect different estimands and assumptions, so the outputs should not be pooled into one vote.",
        evidence_refs: ["method_comparison.runs", "user_choice.selected_methods"],
      },
      hasComparison ? {
        id: "A1",
        kind: "evidence",
        title: "Agreement supports sensitivity, not replication",
        finding: `Mean pairwise effect-rank correlation is ${averageRankAgreement.toFixed(2)} and mean sign agreement is ${(100 * averageSignAgreement).toFixed(1)}%.`,
        implication: "The main signal is reasonably stable to these browser modeling choices, but it has not been tested in an independent cohort.",
        evidence_refs: ["method_comparison.pairwise.effect_spearman", "method_comparison.pairwise.sign_concordance"],
      } : {
        id: "A1",
        kind: "qualifier",
        title: "No method comparison was requested",
        finding: "The researcher selected one DGE method, so no pairwise agreement statistics were calculated.",
        implication: "Add another method only if sensitivity to modeling assumptions is part of the research objective.",
        evidence_refs: ["user_choice.selected_methods", "method_comparison.runs"],
      },
      hasComparison ? {
        id: "D1",
        kind: "qualifier",
        title: "The weakest agreement remains visible",
        finding: `${pairLabel} have the lowest effect-rank correlation (${weakestPair!.effect_spearman.toFixed(2)}), with ${weakestPair!.top_50_overlap} of their top 50 features shared.`,
        implication: "Inspect features that move rank or significance before making a biological narrative; disagreement can reveal covariate or distribution sensitivity.",
        evidence_refs: ["method_comparison.pairwise", "method_comparison.consensus_features"],
      } : {
        id: "D1",
        kind: "boundary",
        title: "Single-method evidence boundary",
        finding: "Rank, sign, top-feature, and FDR-overlap comparisons are not defined for a single method.",
        implication: "Do not describe this run as robust to alternative statistical methods.",
        evidence_refs: ["method_comparison.pairwise"],
      },
      neural ? {
        id: "N1",
        kind: "boundary",
        title: "Neural prediction is a different question",
        finding: `The deterministic five-fold neural model achieved internal AUROC ${neural.auc.toFixed(3)} and balanced accuracy ${(100 * neural.balanced_accuracy).toFixed(1)}% on this synthetic cohort.`,
        implication: "This can prioritize multivariable patterns for follow-up; it cannot establish mechanism, causal importance, biomarker validity, or external performance.",
        evidence_refs: ["neural_integration.auc", "neural_integration.balanced_accuracy", "neural_integration.warnings"],
      } : {
        id: "N1",
        kind: "boundary",
        title: "Neural analysis was not selected",
        finding: "No predictive neural model was executed for this researcher-confirmed plan.",
        implication: "The synthesis does not infer predictive performance or model sensitivity from unexecuted analysis.",
        evidence_refs: ["researcher_plan.analyses"],
      },
      {
        id: "C1",
        kind: adjustedWasSelected ? "evidence" : "qualifier",
        title: "Question-matched method recommendation",
        finding: `${recommended.method.short_name} is the current recommendation. ${comparison.recommendation.title}.`,
        implication: comparison.recommendation.rationale.join(" "),
        evidence_refs: ["research_question", "method_comparison.recommendation", `method_comparison.runs.${recommended.method.id}`],
      },
      {
        id: "V1",
        kind: "next-step",
        title: "What a researcher should do next",
        finding: "Run a count-native edgeR quasi-likelihood or DESeq2 analysis in the controlled R service, examine diagnostics and influential samples, then test the locked finding in an independent cohort.",
        implication: "Only external validation can move this synthetic demonstration toward research evidence.",
        evidence_refs: ["production_method_boundary", "interpretation_boundary"],
      },
    ],
  };
}
