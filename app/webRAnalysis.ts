import { melanomaCountsCsv, melanomaMetadataCsv, type FeatureResult, type MelanomaDataset } from "./melanomaDemo.ts";

export type WebRMethodId = "r_adjusted_lm" | "r_welch" | "r_wilcoxon";

export type WebRMethod = {
  id: WebRMethodId;
  package_name: "stats";
  function_name: string;
  name: string;
  short_name: string;
  role: string;
  adjusts_covariates: boolean;
  answers: string;
  limitation: string;
};

export const webRMethods: WebRMethod[] = [
  {
    id: "r_adjusted_lm",
    package_name: "stats",
    function_name: "model.matrix + lm.fit algebra",
    name: "R multivariable log-CPM model",
    short_name: "R Adjusted OLS",
    role: "Question-matched R verification",
    adjusts_covariates: true,
    answers: "The conditional response association after the seven declared clinical and technical covariates.",
    limitation: "Runs in real R through WebAssembly, but it remains a transformed-count model rather than edgeR or DESeq2.",
  },
  {
    id: "r_welch",
    package_name: "stats",
    function_name: "Welch t statistic",
    name: "R Welch two-group screen",
    short_name: "R Welch",
    role: "Unadjusted R sensitivity analysis",
    adjusts_covariates: false,
    answers: "The unadjusted difference in mean log-CPM with unequal group variances.",
    limitation: "Does not adjust the declared covariates and should not replace the multivariable primary model.",
  },
  {
    id: "r_wilcoxon",
    package_name: "stats",
    function_name: "wilcox.test",
    name: "R Wilcoxon rank-sum screen",
    short_name: "R Wilcoxon",
    role: "Rank-based R sensitivity analysis",
    adjusts_covariates: false,
    answers: "Whether response groups differ in their feature-level expression-rank distributions.",
    limitation: "Uses a different estimand, cannot adjust covariates, and can be slower on mobile browsers.",
  },
];

export type WebRMethodRun = {
  method: WebRMethod;
  results: FeatureResult[];
  significant_count: number;
  positive_count: number;
  negative_count: number;
};

export type WebRExecutionResult = {
  engine: "webR WebAssembly";
  r_version: string;
  package_versions: Record<string, string>;
  methods: WebRMethodRun[];
  warnings: string[];
};

type WebRRuntime = import("webr").WebR;

let runtimePromise: Promise<WebRRuntime> | null = null;

export async function getWebRRuntime(onProgress?: (message: string) => void): Promise<WebRRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      onProgress?.("Downloading the browser R runtime");
      const { WebR } = await import("webr");
      const runtime = new WebR();
      await runtime.init();
      return runtime;
    })();
  } else {
    onProgress?.("Reusing the initialized browser R runtime");
  }
  return runtimePromise;
}

function parseRResults(value: string, dataset: MelanomaDataset, selectedMethods: WebRMethodId[]): WebRMethodRun[] {
  const lines = value.trim().split("\n");
  if (lines.length < 2 || !lines[0].startsWith("method_id\tfeature_id")) throw new Error("R returned an unreadable result table");
  const programs = new Map(dataset.featureIds.map((feature, index) => [feature, dataset.programs[index]]));
  const grouped = new Map<WebRMethodId, FeatureResult[]>();
  lines.slice(1).forEach((line) => {
    const [methodId, featureId, effect, statistic, pValue, adjustedPValue] = line.split("\t");
    if (!selectedMethods.includes(methodId as WebRMethodId)) return;
    const row: FeatureResult = {
      feature_id: featureId,
      program: programs.get(featureId) ?? "Unmapped synthetic feature",
      response_effect: Number(effect),
      statistic: Number(statistic),
      p_value: Number(pValue),
      adjusted_p_value: Number(adjustedPValue),
    };
    const current = grouped.get(methodId as WebRMethodId) ?? [];
    current.push(row);
    grouped.set(methodId as WebRMethodId, current);
  });
  return selectedMethods.map((methodId) => {
    const method = webRMethods.find((item) => item.id === methodId)!;
    const results = (grouped.get(methodId) ?? []).sort((left, right) => left.adjusted_p_value - right.adjusted_p_value || Math.abs(right.response_effect) - Math.abs(left.response_effect));
    if (results.length !== dataset.featureIds.length) throw new Error(`${method.short_name} returned ${results.length} of ${dataset.featureIds.length} expected features`);
    const significant = results.filter((row) => row.adjusted_p_value < 0.05);
    return {
      method,
      results,
      significant_count: significant.length,
      positive_count: significant.filter((row) => row.response_effect > 0).length,
      negative_count: significant.filter((row) => row.response_effect < 0).length,
    };
  });
}

export async function runWebRAnalysis(dataset: MelanomaDataset, selectedMethods: WebRMethodId[], onProgress?: (message: string) => void): Promise<WebRExecutionResult> {
  if (selectedMethods.length === 0) throw new Error("Select at least one R method");
  const runtime = await getWebRRuntime(onProgress);
  onProgress?.("Loading the synthetic matrix into R");
  const suffix = `${dataset.seed}-${Date.now()}`;
  const metadataPath = `/tmp/biotrust-metadata-${suffix}.csv`;
  const countsPath = `/tmp/biotrust-counts-${suffix}.csv`;
  await runtime.FS.writeFile(metadataPath, new TextEncoder().encode(melanomaMetadataCsv(dataset)));
  await runtime.FS.writeFile(countsPath, new TextEncoder().encode(melanomaCountsCsv(dataset)));
  const methodVector = selectedMethods.map((method) => `"${method}"`).join(", ");
  onProgress?.(`Executing ${selectedMethods.length} selected method${selectedMethods.length === 1 ? "" : "s"} in R`);
  const table = await runtime.evalRString(`
    metadata <- utils::read.csv("${metadataPath}", check.names = FALSE, stringsAsFactors = TRUE)
    count_frame <- utils::read.csv("${countsPath}", check.names = FALSE)
    counts <- as.matrix(count_frame[, -1, drop = FALSE])
    storage.mode(counts) <- "double"
    library_size <- rowSums(counts)
    log_cpm <- log2(sweep(counts, 1, library_size, "/") * 1e6 + 0.5)
    responder <- metadata$response == "Responder"
    selected_methods <- c(${methodVector})
    format_number <- function(x) format(x, digits = 17, scientific = TRUE, trim = TRUE)
    make_lines <- function(method_id, effect, statistic, p_value) {
      adjusted <- stats::p.adjust(p_value, method = "BH")
      paste(method_id, colnames(log_cpm), format_number(effect), format_number(statistic), format_number(p_value), format_number(adjusted), sep = "\\t")
    }
    output <- character()
    if ("r_adjusted_lm" %in% selected_methods) {
      design <- stats::model.matrix(~ response_binary + scale(age_years) + recorded_sex + disease_stage + biopsy_site + prior_systemic_therapy + tumor_purity + batch, data = transform(metadata, response_binary = as.numeric(responder)))
      inverse_information <- solve(crossprod(design))
      coefficients <- inverse_information %*% crossprod(design, log_cpm)
      residuals <- log_cpm - design %*% coefficients
      degrees_freedom <- nrow(design) - ncol(design)
      variance <- colSums(residuals ^ 2) / degrees_freedom
      response_row <- match("response_binary", rownames(coefficients))
      standard_error <- sqrt(inverse_information[response_row, response_row] * variance)
      statistic <- coefficients[response_row, ] / standard_error
      p_value <- 2 * stats::pt(-abs(statistic), df = degrees_freedom)
      output <- c(output, make_lines("r_adjusted_lm", coefficients[response_row, ], statistic, p_value))
    }
    if ("r_welch" %in% selected_methods) {
      first <- log_cpm[responder, , drop = FALSE]
      second <- log_cpm[!responder, , drop = FALSE]
      effect <- colMeans(first) - colMeans(second)
      first_variance <- apply(first, 2, stats::var)
      second_variance <- apply(second, 2, stats::var)
      first_term <- first_variance / nrow(first)
      second_term <- second_variance / nrow(second)
      standard_error <- sqrt(first_term + second_term)
      statistic <- effect / standard_error
      degrees_freedom <- (first_term + second_term) ^ 2 / ((first_term ^ 2 / (nrow(first) - 1)) + (second_term ^ 2 / (nrow(second) - 1)))
      p_value <- 2 * stats::pt(-abs(statistic), df = degrees_freedom)
      output <- c(output, make_lines("r_welch", effect, statistic, p_value))
    }
    if ("r_wilcoxon" %in% selected_methods) {
      wilcoxon <- apply(log_cpm, 2, function(values) {
        fit <- suppressWarnings(stats::wilcox.test(values[responder], values[!responder], exact = FALSE))
        c(effect = stats::median(values[responder]) - stats::median(values[!responder]), statistic = unname(fit$statistic), p_value = fit$p.value)
      })
      output <- c(output, make_lines("r_wilcoxon", wilcoxon["effect", ], wilcoxon["statistic", ], wilcoxon["p_value", ]))
    }
    paste(c("method_id\\tfeature_id\\tresponse_effect\\tstatistic\\tp_value\\tadjusted_p_value", output), collapse = "\\n")
  `);
  const rVersion = await runtime.evalRString("R.version.string");
  const statsVersion = await runtime.evalRString('as.character(utils::packageVersion("stats"))');
  onProgress?.("R execution complete");
  return {
    engine: "webR WebAssembly",
    r_version: rVersion,
    package_versions: { stats: statsVersion },
    methods: parseRResults(table, dataset, selectedMethods),
    warnings: [
      "The R runtime executed locally in this browser; the synthetic matrix was not uploaded.",
      "R stats transformed-count methods are not count-native edgeR or DESeq2 models.",
      "R method agreement is a software and modeling sensitivity check, not external replication.",
    ],
  };
}

export async function closeWebRRuntime(): Promise<void> {
  if (!runtimePromise) return;
  const runtime = await runtimePromise;
  await runtime.close();
  runtimePromise = null;
}

export function webRResultsCsv(result: WebRExecutionResult): string {
  const lines = ["engine,r_version,package,package_version,method_id,method_name,feature_id,program,response_effect,statistic,p_value,adjusted_p_value"];
  result.methods.forEach((run) => run.results.forEach((row) => lines.push([
    result.engine,
    `"${result.r_version.replaceAll('"', '""')}"`,
    run.method.package_name,
    result.package_versions[run.method.package_name],
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
