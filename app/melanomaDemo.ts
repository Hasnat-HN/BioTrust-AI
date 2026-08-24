export const MELANOMA_DEMO_SEED = 20260825;
export const MELANOMA_SAMPLE_COUNT = 180;
export const MELANOMA_FEATURE_COUNT = 1200;

export type SyntheticResponse = "Responder" | "Non-responder";
export type SyntheticBatch = "Batch_1" | "Batch_2" | "Batch_3";

export type MelanomaSample = {
  sample_id: string;
  response: SyntheticResponse;
  tumor_purity: number;
  age_years: number;
  recorded_sex: "Female" | "Male";
  disease_stage: "Stage_III" | "Stage_IV";
  biopsy_site: "Skin" | "Lymph_node" | "Visceral";
  prior_systemic_therapy: "Yes" | "No";
  batch: SyntheticBatch;
  synthetic_t_cell_fraction: number;
  synthetic_myeloid_fraction: number;
  synthetic_stromal_fraction: number;
};

export type MelanomaDataset = {
  seed: number;
  samples: MelanomaSample[];
  featureIds: string[];
  programs: string[];
  counts: number[][];
};

export type ModelResult = {
  label: string;
  formula: string;
  sample_count: number;
  response_effect: number;
  standard_error: number;
  confidence_low: number;
  confidence_high: number;
  statistic: number;
  p_value: number;
};

export type FeatureResult = {
  feature_id: string;
  program: string;
  response_effect: number;
  statistic: number;
  p_value: number;
  adjusted_p_value: number;
};

export type ProgramSummary = {
  program: string;
  feature_count: number;
  mean_response_effect: number;
  fdr_significant_features: number;
};

export type MelanomaAnalysisResult = {
  execution_id: string;
  generated_at: string;
  seed: number;
  dataset: {
    sample_count: number;
    responder_count: number;
    non_responder_count: number;
    feature_count: number;
    median_purity: number;
  };
  primary: ModelResult;
  naive: ModelResult;
  sensitivity: ModelResult;
  feature_results: FeatureResult[];
  program_summaries: ProgramSummary[];
  fdr_significant_features: number;
  hashes: {
    algorithm: "FNV-1a demo checksum";
    metadata: string;
    counts: string;
    results: string;
  };
  warnings: string[];
};

export type InterpretationConnection = {
  id: string;
  kind: "evidence" | "qualifier" | "boundary" | "next-step";
  title: string;
  finding: string;
  implication: string;
  evidence_refs: string[];
};

export type MelanomaInterpretation = {
  generated_by: "BioTrust deterministic evidence-synthesis rules v1";
  neural_engine_status: "EXECUTED_SEPARATELY";
  summary: string;
  connections: InterpretationConnection[];
};

type RegressionFit = {
  coefficients: number[];
  standardErrors: number[];
  statistics: number[];
  pValues: number[];
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

function createRandom(seed: number) {
  let state = seed >>> 0;
  let spare: number | null = null;
  const uniform = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  };
  const normal = () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    const radius = Math.sqrt(-2 * Math.log(Math.max(uniform(), Number.EPSILON)));
    const angle = 2 * Math.PI * uniform();
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
  return { uniform, normal };
}

function shuffle<T>(items: T[], uniform: () => number): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(uniform() * (index + 1));
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output;
}

function featureProgram(index: number): string {
  if (index < 36) return "T-cell-inflamed program";
  if (index < 66) return "Interferon-response program";
  if (index < 96) return "Myeloid program";
  if (index < 126) return "Stromal program";
  return "Background";
}

function featureId(index: number): string {
  if (index < 36) return `TME_TCELL_${String(index + 1).padStart(3, "0")}`;
  if (index < 66) return `TME_IFNG_${String(index - 35).padStart(3, "0")}`;
  if (index < 96) return `TME_MYELOID_${String(index - 65).padStart(3, "0")}`;
  if (index < 126) return `TME_STROMAL_${String(index - 95).padStart(3, "0")}`;
  return `BACKGROUND_${String(index - 125).padStart(4, "0")}`;
}

export function generateSyntheticMelanomaDataset(seed = MELANOMA_DEMO_SEED): MelanomaDataset {
  const random = createRandom(seed);
  const responses = shuffle<SyntheticResponse>([
    ...Array.from({ length: 72 }, () => "Responder" as const),
    ...Array.from({ length: 108 }, () => "Non-responder" as const),
  ], random.uniform);
  const batches = shuffle<SyntheticBatch>(Array.from({ length: MELANOMA_SAMPLE_COUNT }, (_, index) => `Batch_${(index % 3) + 1}` as SyntheticBatch), random.uniform);
  const latent = responses.map((response, index) => {
    const responseValue = response === "Responder" ? 1 : 0;
    const batchShift = batches[index] === "Batch_2" ? 0.08 : batches[index] === "Batch_3" ? -0.06 : 0;
    const purity = clamp(0.68 - responseValue * 0.075 + batchShift + random.normal() * 0.095, 0.34, 0.92);
    const ageYears = Math.round(clamp(61 - responseValue * 3 + random.normal() * 12, 28, 88));
    const recordedSex = random.uniform() < (responseValue ? 0.46 : 0.38) ? "Female" as const : "Male" as const;
    const diseaseStage = random.uniform() < (responseValue ? 0.53 : 0.31) ? "Stage_III" as const : "Stage_IV" as const;
    const siteDraw = random.uniform();
    const biopsySite = siteDraw < (responseValue ? 0.35 : 0.22) ? "Skin" as const : siteDraw < (responseValue ? 0.72 : 0.57) ? "Lymph_node" as const : "Visceral" as const;
    const priorSystemicTherapy = random.uniform() < (responseValue ? 0.28 : 0.43) ? "Yes" as const : "No" as const;
    const tCell = clamp(0.12 + responseValue * 0.075 + (0.67 - purity) * 0.24 + (diseaseStage === "Stage_III" ? 0.018 : 0) + (biopsySite === "Skin" ? 0.012 : biopsySite === "Visceral" ? -0.012 : 0) + random.normal() * 0.04, 0.025, 0.42);
    const myeloid = clamp(0.19 - responseValue * 0.035 + (0.67 - purity) * 0.20 + random.normal() * 0.04, 0.04, 0.42);
    const stromal = clamp(0.13 + (0.67 - purity) * 0.29 + random.normal() * 0.035, 0.025, 0.38);
    return { response, responseValue, batch: batches[index], purity, ageYears, recordedSex, diseaseStage, biopsySite, priorSystemicTherapy, tCell, myeloid, stromal };
  });
  const samples = latent.map((sample, index): MelanomaSample => ({
    sample_id: `SYN_MEL_${String(index + 1).padStart(3, "0")}`,
    response: sample.response,
    tumor_purity: Number(sample.purity.toFixed(4)),
    age_years: sample.ageYears,
    recorded_sex: sample.recordedSex,
    disease_stage: sample.diseaseStage,
    biopsy_site: sample.biopsySite,
    prior_systemic_therapy: sample.priorSystemicTherapy,
    batch: sample.batch,
    synthetic_t_cell_fraction: Number(sample.tCell.toFixed(4)),
    synthetic_myeloid_fraction: Number(sample.myeloid.toFixed(4)),
    synthetic_stromal_fraction: Number(sample.stromal.toFixed(4)),
  }));
  const featureIds = Array.from({ length: MELANOMA_FEATURE_COUNT }, (_, index) => featureId(index));
  const programs = Array.from({ length: MELANOMA_FEATURE_COUNT }, (_, index) => featureProgram(index));
  const counts = latent.map((sample, sampleIndex) => {
    const libraryScale = Math.exp(random.normal() * 0.13);
    return featureIds.map((_, featureIndex) => {
      const program = programs[featureIndex];
      const base = program === "Background" && featureIndex % 4 === 0
        ? -0.7 + (featureIndex % 7) * 0.12 + random.normal() * 0.18
        : 3.45 + (featureIndex % 31) / 23 + random.normal() * 0.13;
      let signal = 0;
      if (program === "T-cell-inflamed program") signal = 4.0 * sample.tCell + 0.10 * sample.responseValue;
      if (program === "Interferon-response program") signal = 2.7 * sample.tCell + 0.18 * sample.responseValue;
      if (program === "Myeloid program") signal = 2.1 * sample.myeloid - 0.04 * sample.responseValue;
      if (program === "Stromal program") signal = 2.0 * sample.stromal;
      const batchEffect = sample.batch === "Batch_2" ? ((featureIndex % 11) - 5) * 0.012 : sample.batch === "Batch_3" ? ((featureIndex % 13) - 6) * -0.01 : 0;
      const structuredNoise = Math.sin((sampleIndex + 1) * (featureIndex + 3) * 0.013) * 0.08;
      return Math.max(0, Math.round(Math.exp(base + signal + batchEffect + structuredNoise + random.normal() * 0.27) * libraryScale));
    });
  });
  return { seed, samples, featureIds, programs, counts };
}

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function multiply(left: number[][], right: number[][]): number[][] {
  const transposed = transpose(right);
  return left.map((row) => transposed.map((column) => row.reduce((total, value, index) => total + value * column[index], 0)));
}

function invert(matrix: number[][]): number[][] {
  const size = matrix.length;
  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: size }, (_, columnIndex) => rowIndex === columnIndex ? 1 : 0),
  ]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-12) throw new Error("The synthetic design matrix is singular.");
    augmented[column] = augmented[column].map((value) => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map((row) => row.slice(size));
}

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

function fitLinearModel(design: number[][], outcome: number[]): RegressionFit {
  const xt = transpose(design);
  const xtxInverse = invert(multiply(xt, design));
  const xty = xt.map((column) => [column.reduce((total, value, index) => total + value * outcome[index], 0)]);
  const coefficients = multiply(xtxInverse, xty).map((row) => row[0]);
  const residuals = outcome.map((value, row) => value - design[row].reduce((total, predictor, column) => total + predictor * coefficients[column], 0));
  const variance = residuals.reduce((total, value) => total + value * value, 0) / (design.length - design[0].length);
  const standardErrors = xtxInverse.map((row, index) => Math.sqrt(Math.max(0, variance * row[index])));
  const statistics = coefficients.map((value, index) => value / standardErrors[index]);
  const pValues = statistics.map(twoSidedNormalP);
  return { coefficients, standardErrors, statistics, pValues };
}

function designMatrix(samples: MelanomaSample[], adjusted: boolean): number[][] {
  return samples.map((sample) => {
    const response = sample.response === "Responder" ? 1 : 0;
    return adjusted ? [
      1,
      response,
      (sample.age_years - 60) / 10,
      sample.recorded_sex === "Male" ? 1 : 0,
      sample.disease_stage === "Stage_IV" ? 1 : 0,
      sample.biopsy_site === "Lymph_node" ? 1 : 0,
      sample.biopsy_site === "Visceral" ? 1 : 0,
      sample.prior_systemic_therapy === "Yes" ? 1 : 0,
      sample.tumor_purity,
      sample.batch === "Batch_2" ? 1 : 0,
      sample.batch === "Batch_3" ? 1 : 0,
    ] : [1, response];
  });
}

export function calculateLogCpm(dataset: MelanomaDataset): number[][] {
  return dataset.counts.map((sampleCounts) => {
    const librarySize = sampleCounts.reduce((total, value) => total + value, 0);
    return sampleCounts.map((count) => Math.log2(((count + 0.5) * 1_000_000) / (librarySize + 1)));
  });
}

function zScores(values: number[]): number[] {
  const center = mean(values);
  const sd = Math.sqrt(values.reduce((total, value) => total + (value - center) ** 2, 0) / Math.max(1, values.length - 1));
  return values.map((value) => (value - center) / (sd || 1));
}

function scoreProgram(expression: number[][], featureIndices: number[]): number[] {
  const standardized = featureIndices.map((featureIndex) => zScores(expression.map((row) => row[featureIndex])));
  return expression.map((_, sampleIndex) => mean(standardized.map((feature) => feature[sampleIndex])));
}

function summarizeModel(label: string, formula: string, samples: MelanomaSample[], outcome: number[], adjusted: boolean): ModelResult {
  const fit = fitLinearModel(designMatrix(samples, adjusted), outcome);
  const effect = fit.coefficients[1];
  const standardError = fit.standardErrors[1];
  return {
    label,
    formula,
    sample_count: samples.length,
    response_effect: effect,
    standard_error: standardError,
    confidence_low: effect - 1.96 * standardError,
    confidence_high: effect + 1.96 * standardError,
    statistic: fit.statistics[1],
    p_value: fit.pValues[1],
  };
}

function bhAdjust(pValues: number[]): number[] {
  const ordered = pValues.map((value, index) => ({ value, index })).sort((left, right) => left.value - right.value);
  const adjusted = Array<number>(pValues.length);
  let previous = 1;
  for (let rankIndex = ordered.length - 1; rankIndex >= 0; rankIndex -= 1) {
    const rank = rankIndex + 1;
    previous = Math.min(previous, (ordered[rankIndex].value * ordered.length) / rank);
    adjusted[ordered[rankIndex].index] = Math.min(1, previous);
  }
  return adjusted;
}

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function fnv1a(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

const csvValue = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function melanomaMetadataCsv(dataset: MelanomaDataset): string {
  const header = ["sample_id", "response", "tumor_purity", "age_years", "recorded_sex", "disease_stage", "biopsy_site", "prior_systemic_therapy", "batch", "synthetic_t_cell_fraction", "synthetic_myeloid_fraction", "synthetic_stromal_fraction"];
  return [header.join(","), ...dataset.samples.map((sample) => header.map((field) => csvValue(sample[field as keyof MelanomaSample])).join(","))].join("\n");
}

export function melanomaCountsCsv(dataset: MelanomaDataset): string {
  return [
    ["sample_id", ...dataset.featureIds].join(","),
    ...dataset.samples.map((sample, index) => [sample.sample_id, ...dataset.counts[index]].join(",")),
  ].join("\n");
}

export function melanomaResultsCsv(result: MelanomaAnalysisResult): string {
  const header = ["feature_id", "program", "response_effect", "statistic", "p_value", "adjusted_p_value"];
  return [header.join(","), ...result.feature_results.map((row) => header.map((field) => csvValue(row[field as keyof FeatureResult])).join(","))].join("\n");
}

export function runSyntheticMelanomaAnalysis(seed = MELANOMA_DEMO_SEED, purityThreshold = 0.5): { dataset: MelanomaDataset; result: MelanomaAnalysisResult } {
  const dataset = generateSyntheticMelanomaDataset(seed);
  const expression = calculateLogCpm(dataset);
  const tCellFeatures = dataset.programs.map((program, index) => ({ program, index })).filter(({ program }) => program === "T-cell-inflamed program").map(({ index }) => index);
  const programScore = scoreProgram(expression, tCellFeatures);
  const fullFormula = "T-cell program score ~ response + age + recorded sex + stage + biopsy site + prior therapy + tumor purity + batch";
  const primary = summarizeModel("Primary adjusted model", fullFormula, dataset.samples, programScore, true);
  const naive = summarizeModel("Naive comparison", "T-cell program score ~ response", dataset.samples, programScore, false);
  const retainedIndices = dataset.samples.map((sample, index) => ({ sample, index })).filter(({ sample }) => sample.tumor_purity >= purityThreshold).map(({ index }) => index);
  const sensitivitySamples = retainedIndices.map((index) => dataset.samples[index]);
  const sensitivityScores = retainedIndices.map((index) => programScore[index]);
  const sensitivity = summarizeModel(`Purity >= ${purityThreshold.toFixed(2)} sensitivity`, fullFormula, sensitivitySamples, sensitivityScores, true);
  const adjustedDesign = designMatrix(dataset.samples, true);
  const rawFeatureResults = dataset.featureIds.map((id, featureIndex) => {
    const fit = fitLinearModel(adjustedDesign, expression.map((row) => row[featureIndex]));
    return {
      feature_id: id,
      program: dataset.programs[featureIndex],
      response_effect: fit.coefficients[1],
      statistic: fit.statistics[1],
      p_value: fit.pValues[1],
      adjusted_p_value: 1,
    };
  });
  const adjusted = bhAdjust(rawFeatureResults.map((row) => row.p_value));
  const featureResults = rawFeatureResults.map((row, index) => ({ ...row, adjusted_p_value: adjusted[index] })).sort((left, right) => left.adjusted_p_value - right.adjusted_p_value || Math.abs(right.response_effect) - Math.abs(left.response_effect));
  const programOrder = ["T-cell-inflamed program", "Interferon-response program", "Myeloid program", "Stromal program", "Background"];
  const programSummaries = programOrder.map((program) => {
    const rows = featureResults.filter((row) => row.program === program);
    return {
      program,
      feature_count: rows.length,
      mean_response_effect: mean(rows.map((row) => row.response_effect)),
      fdr_significant_features: rows.filter((row) => row.adjusted_p_value < 0.05).length,
    };
  });
  const metadata = melanomaMetadataCsv(dataset);
  const counts = melanomaCountsCsv(dataset);
  const resultsForHash = featureResults.map((row) => [row.feature_id, row.response_effect.toFixed(8), row.p_value.toExponential(8), row.adjusted_p_value.toExponential(8)].join(",")).join("\n");
  const result: MelanomaAnalysisResult = {
    execution_id: `SYN-MEL-${seed}`,
    generated_at: "2026-08-25T12:00:00.000Z",
    seed,
    dataset: {
      sample_count: dataset.samples.length,
      responder_count: dataset.samples.filter((sample) => sample.response === "Responder").length,
      non_responder_count: dataset.samples.filter((sample) => sample.response === "Non-responder").length,
      feature_count: dataset.featureIds.length,
      median_purity: median(dataset.samples.map((sample) => sample.tumor_purity)),
    },
    primary,
    naive,
    sensitivity,
    feature_results: featureResults,
    program_summaries: programSummaries,
    fdr_significant_features: featureResults.filter((row) => row.adjusted_p_value < 0.05).length,
    hashes: {
      algorithm: "FNV-1a demo checksum",
      metadata: fnv1a(metadata),
      counts: fnv1a(counts),
      results: fnv1a(resultsForHash),
    },
    warnings: [
      "All samples, response labels, counts, and microenvironment fractions are procedurally generated.",
      "The browser runner uses score-level and feature-level linear models; it does not execute edgeR or CAMERA.",
      "Program scores are expression summaries, not direct measurements of immune-cell abundance.",
      "This demonstration cannot establish causality, treatment benefit, biomarker validity, or clinical utility.",
    ],
  };
  return { dataset, result };
}

export function buildMelanomaInterpretation(result: MelanomaAnalysisResult): MelanomaInterpretation {
  const attenuation = result.naive.response_effect === 0 ? 0 : 100 * (result.naive.response_effect - result.primary.response_effect) / Math.abs(result.naive.response_effect);
  const sensitivityShift = result.sensitivity.response_effect - result.primary.response_effect;
  const sameDirection = Math.sign(result.sensitivity.response_effect) === Math.sign(result.primary.response_effect);
  const tCell = result.program_summaries.find((program) => program.program === "T-cell-inflamed program")!;
  const interferon = result.program_summaries.find((program) => program.program === "Interferon-response program")!;
  const myeloid = result.program_summaries.find((program) => program.program === "Myeloid program")!;
  const background = result.program_summaries.find((program) => program.program === "Background")!;
  return {
    generated_by: "BioTrust deterministic evidence-synthesis rules v1",
    neural_engine_status: "EXECUTED_SEPARATELY",
    summary: sameDirection
      ? "The synthetic T-cell-inflamed association remains directionally stable after multivariable adjustment and the higher-purity sensitivity filter. Program-level coherence supports a structured synthetic signal, while background discoveries and the observational design limit interpretation."
      : "The sensitivity result changes direction, so the primary synthetic association is not robust enough for a positive interpretation.",
    connections: [
      {
        id: "E1",
        kind: "evidence",
        title: "Primary adjusted association",
        finding: `Adjusted response effect ${result.primary.response_effect.toFixed(2)} (95% interval ${result.primary.confidence_low.toFixed(2)} to ${result.primary.confidence_high.toFixed(2)}; p=${result.primary.p_value.toExponential(2)}).`,
        implication: "The declared multivariable model supports an association within this synthetic fixture.",
        evidence_refs: ["primary.model", "primary.confidence_interval", "primary.p_value"],
      },
      {
        id: "Q1",
        kind: "qualifier",
        title: "Covariates changed the estimate",
        finding: `The adjusted estimate is ${Math.abs(attenuation).toFixed(1)}% ${attenuation >= 0 ? "smaller" : "larger"} than the naive response-only estimate.`,
        implication: "Cohort composition and technical structure matter; the unadjusted comparison should not be treated as the primary answer.",
        evidence_refs: ["naive.response_effect", "primary.response_effect", "design.covariates"],
      },
      {
        id: "E2",
        kind: sameDirection ? "evidence" : "qualifier",
        title: "Higher-purity sensitivity",
        finding: `${result.sensitivity.sample_count} tumors remain; the response effect is ${result.sensitivity.response_effect.toFixed(2)} (${sensitivityShift >= 0 ? "+" : ""}${sensitivityShift.toFixed(2)} versus primary).`,
        implication: sameDirection ? "The direction is not explained solely by lower-purity synthetic tumors." : "The primary conclusion is sensitive to the purity restriction.",
        evidence_refs: ["sensitivity.sample_count", "sensitivity.response_effect", "sensitivity.p_value"],
      },
      {
        id: "E3",
        kind: "evidence",
        title: "Program coherence",
        finding: `T-cell-inflamed mean effect ${tCell.mean_response_effect.toFixed(2)}; interferon-response ${interferon.mean_response_effect.toFixed(2)}; myeloid ${myeloid.mean_response_effect.toFixed(2)}.`,
        implication: "Related synthetic programs move coherently, which is more informative than relying on one selected feature.",
        evidence_refs: ["program.T-cell-inflamed", "program.Interferon-response", "program.Myeloid"],
      },
      {
        id: "B1",
        kind: "boundary",
        title: "Specificity and multiplicity warning",
        finding: `${background.fdr_significant_features} of ${background.feature_count} background features pass BH FDR < 0.05.`,
        implication: "Even adjusted screens contain background discoveries; no individual feature should be promoted without independent validation.",
        evidence_refs: ["program.Background.fdr_significant_features", "multiple_testing.BH"],
      },
      {
        id: "N1",
        kind: "next-step",
        title: "Next decisive analyses",
        finding: "Test prespecified response-by-stage and response-by-biopsy-site interactions, diagnose leverage and nonlinear purity effects, then repeat the locked model in an independent cohort.",
        implication: "These checks separate robustness, effect modification, and external replication; none is supplied by the current synthetic run.",
        evidence_refs: ["design.assumptions", "limitations.observational", "validation.external"],
      },
    ],
  };
}
